import GameSession from '../models/GameSession.js';
import {
  COUNTDOWN_MS,
  getGameWithQuiz,
  clearGameTimer,
  clearHostGrace,
  scheduleTimer,
  sendQuestion,
  endQuestion,
  getLeaderboard,
  finishGame,
  forceEndGame,
  kickPlayer,
  buildHostState,
} from './gameLogic.js';

export function registerHostEvents(io, socket) {
  async function claimHost(pin) {
    const game = await GameSession.findOne({ pin });
    if (!game || game.status === 'finished') return null;
    game.hostSocketId = socket.id;
    await game.save();
    clearHostGrace(pin);
    socket.join(pin);
    socket.data.role = 'host';
    socket.data.pin = pin;
    return game;
  }

  socket.on('host:create-room', async ({ pin }) => {
    try {
      const game = await claimHost(pin);
      if (!game) {
        socket.emit('join:error', { message: 'המשחק לא נמצא' });
        return;
      }
      socket.emit('host:room-created', { pin, title: game.quizTitle });
    } catch (err) {
      console.error('host:create-room error', err);
      socket.emit('join:error', { message: 'שגיאת שרת' });
    }
  });

  // Host refreshed the page / reconnected: take back control of an existing game.
  socket.on('host:resume', async ({ pin }) => {
    try {
      const game = await claimHost(pin);
      if (!game) {
        socket.emit('host:resume-failed');
        return;
      }
      const state = await buildHostState(pin);
      socket.emit('host:room-created', { pin, title: game.quizTitle });
      socket.emit('host:state', state);
      io.to(pin).emit('host:reconnected');
    } catch (err) {
      console.error('host:resume error', err);
      socket.emit('host:resume-failed');
    }
  });

  socket.on('game:start', async ({ pin }) => {
    try {
      const data = await getGameWithQuiz(pin);
      if (!data) return;

      const { game, quiz } = data;
      if (game.hostSocketId !== socket.id) return;
      if (game.status !== 'lobby') return;
      if (game.players.length === 0) return;

      game.status = 'playing';
      game.currentQuestion = 0;
      game.startedAt = new Date();
      game.totalQuestions = quiz.questions.length;
      await game.save();

      io.to(pin).emit('game:started', { countdownMs: COUNTDOWN_MS });

      // Let the 3-2-1 countdown play before the first question.
      scheduleTimer(pin, COUNTDOWN_MS, () => sendQuestion(io, pin, quiz, 0));
    } catch (err) {
      console.error('game:start error', err);
    }
  });

  // Host ends the current question early (before timer / all answers).
  socket.on('question:end', async ({ pin }) => {
    try {
      const game = await GameSession.findOne({ pin });
      if (!game || game.hostSocketId !== socket.id) return;
      await endQuestion(io, pin);
    } catch (err) {
      console.error('question:end error', err);
    }
  });

  socket.on('leaderboard:show', async ({ pin }) => {
    try {
      const game = await GameSession.findOne({ pin });
      if (!game || game.hostSocketId !== socket.id) return;
      const leaderboard = await getLeaderboard(pin);
      if (leaderboard) io.to(pin).emit('leaderboard:show', leaderboard);
    } catch (err) {
      console.error('leaderboard:show error', err);
    }
  });

  socket.on('question:next', async ({ pin }) => {
    try {
      const data = await getGameWithQuiz(pin);
      if (!data) return;

      const { game, quiz } = data;
      if (game.hostSocketId !== socket.id) return;
      if (game.status !== 'playing') return;

      clearGameTimer(pin);

      const nextIndex = game.currentQuestion + 1;
      if (nextIndex >= quiz.questions.length) {
        await finishGame(io, pin, 'host');
        return;
      }

      await sendQuestion(io, pin, quiz, nextIndex);
    } catch (err) {
      console.error('question:next error', err);
    }
  });

  // Host ends the whole game early — results are computed from current scores.
  // In the lobby (nothing played yet) the game is simply cancelled.
  socket.on('game:end', async ({ pin }) => {
    try {
      const game = await GameSession.findOne({ pin });
      if (!game || game.hostSocketId !== socket.id) return;
      if (game.status === 'lobby') await forceEndGame(io, pin, 'host');
      else await finishGame(io, pin, 'host');
    } catch (err) {
      console.error('game:end error', err);
    }
  });

  socket.on('player:kick', async ({ pin, playerId, socketId }) => {
    try {
      const game = await GameSession.findOne({ pin });
      if (!game || game.hostSocketId !== socket.id) return;
      await kickPlayer(io, pin, { playerId, socketId });
    } catch (err) {
      console.error('player:kick error', err);
    }
  });

  socket.on('game:lock', async ({ pin }) => {
    try {
      const game = await GameSession.findOne({ pin });
      if (!game || game.hostSocketId !== socket.id) return;

      game.locked = !game.locked;
      await game.save();

      socket.emit('game:lock-toggled', { locked: game.locked });
    } catch (err) {
      console.error('game:lock error', err);
    }
  });
}
