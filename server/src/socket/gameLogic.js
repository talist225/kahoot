import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import { getSettings } from '../models/Settings.js';
import { calculateScore } from '../utils/scoreCalculator.js';

export const COUNTDOWN_MS = 3500; // matches the client 3-2-1-GO animation

const activeTimers = new Map();      // pin -> question timeout
const hostGraceTimers = new Map();   // pin -> host-disconnect grace timeout

let ioRef = null;
export function setIO(io) { ioRef = io; }
export function getIO() { return ioRef; }

// ---------- helpers ----------

export async function getGameWithQuiz(pin) {
  const game = await GameSession.findOne({ pin });
  if (!game) return null;
  const quiz = await Quiz.findById(game.quizId);
  if (!quiz) return null;
  return { game, quiz };
}

export function publicPlayers(game) {
  return game.players.map((p) => ({
    playerId: p.playerId,
    socketId: p.socketId,
    nickname: p.nickname,
    score: p.score,
    connected: p.connected !== false,
  }));
}

export function startQuestionTimer(io, pin, timeLimit, onTimeout) {
  clearGameTimer(pin);
  const timer = setTimeout(() => {
    activeTimers.delete(pin);
    onTimeout();
  }, timeLimit * 1000);
  activeTimers.set(pin, timer);
}

export function clearGameTimer(pin) {
  if (activeTimers.has(pin)) {
    clearTimeout(activeTimers.get(pin));
    activeTimers.delete(pin);
  }
}

export function scheduleTimer(pin, ms, fn) {
  clearGameTimer(pin);
  const timer = setTimeout(() => {
    activeTimers.delete(pin);
    fn();
  }, ms);
  activeTimers.set(pin, timer);
}

// ---------- host grace period ----------

export function startHostGrace(io, pin, seconds, onExpire) {
  clearHostGrace(pin);
  if (seconds <= 0) { onExpire(); return; }
  const t = setTimeout(() => {
    hostGraceTimers.delete(pin);
    onExpire();
  }, seconds * 1000);
  hostGraceTimers.set(pin, t);
}

export function clearHostGrace(pin) {
  if (hostGraceTimers.has(pin)) {
    clearTimeout(hostGraceTimers.get(pin));
    hostGraceTimers.delete(pin);
  }
}

// ---------- question flow ----------

export function buildQuestionPayload(quiz, questionIndex, extra = {}) {
  const question = quiz.questions[questionIndex];
  return {
    index: questionIndex,
    total: quiz.questions.length,
    text: question.text,
    image: question.image,
    timeLimit: question.timeLimit,
    points: question.points,
    answers: question.answers.map((a) => ({ text: a.text, color: a.color })),
    ...extra,
  };
}

export async function sendQuestion(io, pin, quiz, questionIndex) {
  const question = quiz.questions[questionIndex];
  if (!question) return;

  await GameSession.updateOne(
    { pin },
    { $set: { currentQuestion: questionIndex, questionStartedAt: new Date() } }
  );

  io.to(pin).emit('question:show', buildQuestionPayload(quiz, questionIndex));

  startQuestionTimer(io, pin, question.timeLimit, () => endQuestion(io, pin));
}

/**
 * Ends the current question: notifies host with stats, tells players who
 * did not answer that time is up, and (optionally) reveals the answer.
 */
const endedQuestions = new Set(); // `${pin}:${index}` guard against double-ending

export async function endQuestion(io, pin) {
  clearGameTimer(pin);
  const data = await getGameWithQuiz(pin);
  if (!data) return;
  const { game, quiz } = data;
  if (game.status !== 'playing') return;

  const qIndex = game.currentQuestion;
  const guardKey = `${pin}:${qIndex}`;
  if (endedQuestions.has(guardKey)) return;
  endedQuestions.add(guardKey);
  setTimeout(() => endedQuestions.delete(guardKey), 60 * 60 * 1000);
  const results = computeQuestionResults(game, quiz);
  if (!results) return;

  const settings = await getSettings();
  const ranked = rankPlayers(game);

  io.to(pin).emit('question:timeout');
  io.to(game.hostSocketId).emit('question:results', results);

  game.players.forEach((p) => {
    const answered = p.answers.some((a) => a.questionIndex === qIndex);
    const rank = ranked.findIndex((r) => r.playerId === p.playerId) + 1;
    if (!answered && p.socketId) {
      io.to(p.socketId).emit('answer:result', {
        correct: false,
        points: 0,
        rank,
        score: p.score,
        streak: 0,
        timedOut: true,
      });
    }
  });

  if (settings.showCorrectAnswerToPlayers) {
    io.to(pin).emit('question:ended', {
      index: qIndex,
      correctAnswerIndex: results.correctAnswerIndex,
      answerCounts: results.answerCounts,
    });
  }
}

export function computeQuestionResults(game, quiz) {
  const qIndex = game.currentQuestion;
  const question = quiz.questions[qIndex];
  if (!question) return null;

  const answerCounts = question.answers.map(() => 0);
  let correctCount = 0;
  let answeredCount = 0;

  game.players.forEach((p) => {
    const answer = p.answers.find((a) => a.questionIndex === qIndex);
    if (answer) {
      answeredCount++;
      if (answer.answerId >= 0 && answer.answerId < answerCounts.length) {
        answerCounts[answer.answerId]++;
      }
      if (answer.isCorrect) correctCount++;
    }
  });

  return {
    index: qIndex,
    answerCounts,
    correctAnswerIndex: question.answers.findIndex((a) => a.isCorrect),
    correctCount,
    totalPlayers: game.players.length,
    answeredCount,
  };
}

export async function getQuestionResults(pin) {
  const data = await getGameWithQuiz(pin);
  if (!data) return null;
  return computeQuestionResults(data.game, data.quiz);
}

// ---------- answers ----------

export async function processAnswer(pin, socketId, answerId, timestamp) {
  const data = await getGameWithQuiz(pin);
  if (!data) return null;

  const { game, quiz } = data;
  if (game.status !== 'playing') return null;

  const qIndex = game.currentQuestion;
  const question = quiz.questions[qIndex];
  if (!question) return null;

  const player = game.players.find((p) => p.socketId === socketId);
  if (!player) return null;

  const idx = Number(answerId);
  if (!Number.isInteger(idx) || idx < 0 || idx >= question.answers.length) return null;

  if (player.answers.some((a) => a.questionIndex === qIndex)) return null;

  const timeLimitMs = question.timeLimit * 1000;
  // Trust server clock over client-reported elapsed time when available.
  let elapsed = Number(timestamp) || 0;
  if (game.questionStartedAt) {
    const serverElapsed = Date.now() - new Date(game.questionStartedAt).getTime();
    elapsed = Math.min(Math.max(elapsed, 0), serverElapsed + 500);
  }
  elapsed = Math.min(Math.max(elapsed, 0), timeLimitMs);

  const correctAnswer = question.answers.findIndex((a) => a.isCorrect);
  const isCorrect = idx === correctAnswer;

  const { points, newStreak } = calculateScore(isCorrect, elapsed, timeLimitMs, question.points, player.streak);

  // Atomic update: only succeeds if this player has not yet answered this question.
  const update = await GameSession.updateOne(
    {
      pin,
      status: 'playing',
      currentQuestion: qIndex,
      players: { $elemMatch: { playerId: player.playerId, 'answers.questionIndex': { $ne: qIndex } } },
    },
    {
      $push: {
        'players.$.answers': {
          questionIndex: qIndex,
          answerId: idx,
          timeToAnswer: elapsed,
          isCorrect,
          points,
          answeredAt: new Date(),
        },
      },
      $inc: { 'players.$.score': points },
      $set: { 'players.$.streak': newStreak },
    }
  );
  if (update.modifiedCount === 0) return null;

  const fresh = await GameSession.findOne({ pin });
  const answeredCount = fresh.players.filter((p) => p.answers.some((a) => a.questionIndex === qIndex)).length;
  const ranked = rankPlayers(fresh);
  const me = ranked.find((r) => r.playerId === player.playerId);

  return {
    isCorrect,
    points,
    rank: me?.rank || 0,
    score: me?.score || 0,
    streak: newStreak,
    answeredCount,
    totalPlayers: fresh.players.length,
    allAnswered: answeredCount >= fresh.players.length,
  };
}

// ---------- leaderboard / results ----------

export function rankPlayers(game) {
  return game.players
    .slice()
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((p, i) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      score: p.score,
      streak: p.streak,
      rank: i + 1,
    }));
}

export async function getLeaderboard(pin) {
  const game = await GameSession.findOne({ pin });
  if (!game) return null;
  const players = rankPlayers(game);
  return {
    top5: players.slice(0, 5),
    players,
    questionIndex: game.currentQuestion,
    total: game.totalQuestions,
  };
}

export function computeFinalResults(game) {
  const sorted = game.players.slice().sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);

  const fullResults = sorted.map((p, i) => {
    const answered = p.answers.length;
    const correctAnswers = p.answers.filter((a) => a.isCorrect).length;
    let longestStreak = 0;
    let currentStreak = 0;
    p.answers
      .slice()
      .sort((a, b) => a.questionIndex - b.questionIndex)
      .forEach((a) => {
        if (a.isCorrect) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

    const totalQuestions = game.totalQuestions || answered;
    return {
      playerId: p.playerId,
      nickname: p.nickname,
      score: p.score,
      rank: i + 1,
      correctAnswers,
      totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      longestStreak,
    };
  });

  return { podium: fullResults.slice(0, 3), fullResults };
}

/**
 * Marks the game finished, persists final results/ranks to the DB,
 * bumps the quiz play counter and notifies everyone in the room.
 */
export async function finishGame(io, pin, endedBy = 'host') {
  clearGameTimer(pin);
  clearHostGrace(pin);

  const game = await GameSession.findOne({ pin });
  if (!game) return null;
  if (game.status === 'finished') {
    const cached = { podium: game.finalResults.slice(0, 3), fullResults: game.finalResults };
    return cached;
  }

  const { podium, fullResults } = computeFinalResults(game);

  game.status = 'finished';
  game.finishedAt = new Date();
  game.endedBy = endedBy;
  game.finalResults = fullResults;
  game.players.forEach((p) => {
    const r = fullResults.find((f) => f.playerId === p.playerId);
    if (r) p.finalRank = r.rank;
  });
  await game.save();

  await Quiz.updateOne({ _id: game.quizId }, { $inc: { timesPlayed: 1 } }).catch(() => {});

  const payload = {
    pin,
    title: game.quizTitle,
    totalQuestions: game.totalQuestions,
    playerCount: game.players.length,
    podium,
    fullResults,
    endedBy,
  };
  io.to(pin).emit('game:finished', payload);
  return payload;
}

/** Admin / system: stop a game immediately. */
export async function forceEndGame(io, pin, by = 'admin') {
  clearGameTimer(pin);
  clearHostGrace(pin);
  const game = await GameSession.findOne({ pin });
  if (!game || game.status === 'finished') return;

  if (game.status === 'playing' && game.players.length > 0) {
    await finishGame(io, pin, by);
    return;
  }

  game.status = 'finished';
  game.finishedAt = new Date();
  game.endedBy = by;
  await game.save();
  io.to(pin).emit('game:cancelled', { reason: by });
}

export async function kickPlayer(io, pin, { playerId, socketId }) {
  const game = await GameSession.findOne({ pin });
  if (!game) return false;
  const player = game.players.find((p) => (playerId && p.playerId === playerId) || (socketId && p.socketId === socketId));
  if (!player) return false;

  game.players = game.players.filter((p) => p.playerId !== player.playerId);
  await game.save();

  if (player.socketId) {
    io.to(player.socketId).emit('player:kicked');
    const target = io.sockets.sockets.get(player.socketId);
    if (target) {
      target.leave(pin);
      target.data.pin = null;
    }
  }

  io.to(game.hostSocketId).emit('player:list', {
    players: publicPlayers(game),
    count: game.players.length,
  });
  return true;
}

/** Full state snapshot used when a host reconnects. */
export async function buildHostState(pin) {
  const data = await getGameWithQuiz(pin);
  if (!data) return null;
  const { game, quiz } = data;

  const state = {
    pin,
    status: game.status,
    locked: game.locked,
    title: game.quizTitle,
    players: publicPlayers(game),
  };

  if (game.status === 'playing' && game.currentQuestion >= 0) {
    const question = quiz.questions[game.currentQuestion];
    const startedAt = game.questionStartedAt ? new Date(game.questionStartedAt).getTime() : Date.now();
    const remaining = Math.max(0, Math.ceil((startedAt + question.timeLimit * 1000 - Date.now()) / 1000));
    const results = computeQuestionResults(game, quiz);
    const ended = remaining === 0 || !activeTimers.has(pin);
    state.question = buildQuestionPayload(quiz, game.currentQuestion, { remaining });
    state.answeredCount = results.answeredCount;
    state.questionEnded = ended;
    if (ended) state.results = results;
  }

  if (game.status === 'finished') {
    state.finalResults = { podium: game.finalResults.slice(0, 3), fullResults: game.finalResults };
  }

  return state;
}

/** State snapshot for a reconnecting player. */
export async function buildPlayerState(pin, playerId) {
  const data = await getGameWithQuiz(pin);
  if (!data) return null;
  const { game, quiz } = data;
  const player = game.players.find((p) => p.playerId === playerId);
  if (!player) return null;

  const state = { status: game.status, score: player.score, nickname: player.nickname };

  if (game.status === 'playing' && game.currentQuestion >= 0) {
    const question = quiz.questions[game.currentQuestion];
    const startedAt = game.questionStartedAt ? new Date(game.questionStartedAt).getTime() : Date.now();
    const remaining = Math.max(0, Math.ceil((startedAt + question.timeLimit * 1000 - Date.now()) / 1000));
    const answer = player.answers.find((a) => a.questionIndex === game.currentQuestion);
    state.question = buildQuestionPayload(quiz, game.currentQuestion, { remaining });
    state.answered = !!answer;
    state.answerId = answer ? answer.answerId : null;
    state.questionEnded = remaining === 0 || !activeTimers.has(pin);
    if (answer && state.questionEnded) {
      const rank = rankPlayers(game).find((r) => r.playerId === playerId)?.rank || 0;
      state.answerResult = { correct: answer.isCorrect, points: answer.points, rank, score: player.score, streak: player.streak };
    }
  }

  if (game.status === 'finished') {
    state.finalResults = {
      pin,
      title: game.quizTitle,
      totalQuestions: game.totalQuestions,
      podium: game.finalResults.slice(0, 3),
      fullResults: game.finalResults,
    };
  }

  return state;
}
