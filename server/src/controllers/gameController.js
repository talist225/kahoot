import Quiz from '../models/Quiz.js';
import GameSession from '../models/GameSession.js';
import { createUniquePin } from '../utils/pinGenerator.js';
import { computeFinalResults } from '../socket/gameLogic.js';

export async function createGame(req, res) {
  try {
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ error: 'נדרש מזהה חידון' });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'החידון לא נמצא' });

    const pin = await createUniquePin();

    const game = await GameSession.create({
      pin,
      quizId: quiz._id,
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
      status: 'lobby',
    });

    res.status(201).json({ pin: game.pin, gameId: game._id, title: quiz.title });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getGameByPin(req, res) {
  try {
    const game = await GameSession.findOne({ pin: req.params.pin });
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });

    res.json({
      pin: game.pin,
      status: game.status,
      playerCount: game.players.length,
      title: game.quizTitle || 'חידון',
      locked: game.locked,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Public: final leaderboard of a finished game (shareable results page).
export async function getGameResults(req, res) {
  try {
    const game = await GameSession.findOne({ pin: req.params.pin });
    if (!game) return res.status(404).json({ error: 'המשחק לא נמצא' });
    if (game.status !== 'finished') {
      return res.status(409).json({ error: 'המשחק עדיין לא הסתיים', status: game.status });
    }

    const fullResults = game.finalResults?.length
      ? game.finalResults
      : computeFinalResults(game).fullResults;

    res.json({
      pin: game.pin,
      title: game.quizTitle,
      totalQuestions: game.totalQuestions,
      playerCount: game.players.length,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      podium: fullResults.slice(0, 3),
      fullResults,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
