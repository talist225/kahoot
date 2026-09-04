import { randomUUID } from 'crypto';
import GameSession from '../models/GameSession.js';
import { getSettings } from '../models/Settings.js';
import { validateNickname, validatePin } from '../utils/validators.js';
import {
  processAnswer,
  getQuestionResults,
  clearGameTimer,
  publicPlayers,
  buildPlayerState,
  endQuestion,
} from './gameLogic.js';

export function registerPlayerEvents(io, socket) {
  socket.on('player:join', async ({ pin, nickname }) => {
    try {
      pin = String(pin || '').trim();
      if (!validatePin(pin)) {
        socket.emit('join:error', { message: 'קוד המשחק חייב להיות 6 ספרות' });
        return;
      }
      if (!validateNickname(nickname)) {
        socket.emit('join:error', { message: 'כינוי לא תקין (1-20 תווים)' });
        return;
      }

      const [game, settings] = await Promise.all([GameSession.findOne({ pin }), getSettings()]);

      if (!game || game.status === 'finished') {
        socket.emit('join:error', { message: 'המשחק לא נמצא או שהסתיים' });
        return;
      }
      if (game.status === 'playing' && !settings.allowLateJoin) {
        socket.emit('join:error', { message: 'המשחק כבר התחיל' });
        return;
      }
      if (game.locked) {
        socket.emit('join:error', { message: 'המשחק נעול על ידי המנחה' });
        return;
      }
      if (game.players.length >= settings.maxPlayers) {
        socket.emit('join:error', { message: `המשחק מלא (מקסימום ${settings.maxPlayers} שחקנים)` });
        return;
      }

      const trimmedNick = nickname.trim();
      const lowerNick = trimmedNick.toLowerCase();

      if (settings.blockedNicknames.some((b) => b && lowerNick.includes(b))) {
        socket.emit('join:error', { message: 'הכינוי הזה אינו מותר, נסו כינוי אחר' });
        return;
      }
      if (game.players.some((p) => p.nickname.toLowerCase() === lowerNick)) {
        socket.emit('join:error', { message: 'הכינוי כבר תפוס, בחרו כינוי אחר' });
        return;
      }

      const playerId = randomUUID();
      await GameSession.updateOne(
        { pin },
        {
          $push: {
            players: {
              playerId,
              socketId: socket.id,
              nickname: trimmedNick,
              score: 0,
              streak: 0,
              connected: true,
              joinedAt: new Date(),
              answers: [],
            },
          },
        }
      );

      socket.join(pin);
      socket.data.role = 'player';
      socket.data.pin = pin;
      socket.data.playerId = playerId;
      socket.data.nickname = trimmedNick;

      socket.emit('join:success', {
        pin,
        playerId,
        nickname: trimmedNick,
        gameTitle: game.quizTitle,
        inProgress: game.status === 'playing',
      });

      const fresh = await GameSession.findOne({ pin });
      io.to(fresh.hostSocketId).emit('player:joined', {
        nickname: trimmedNick,
        playerId,
        socketId: socket.id,
        count: fresh.players.length,
        players: publicPlayers(fresh),
      });
    } catch (err) {
      console.error('player:join error', err);
      socket.emit('join:error', { message: 'שגיאת שרת, נסו שוב' });
    }
  });

  // Player refreshed / lost connection: re-attach to their existing slot.
  socket.on('player:rejoin', async ({ pin, playerId }) => {
    try {
      pin = String(pin || '').trim();
      if (!validatePin(pin) || !playerId) {
        socket.emit('rejoin:failed');
        return;
      }
      const game = await GameSession.findOne({ pin });
      const player = game?.players.find((p) => p.playerId === playerId);
      if (!game || !player) {
        socket.emit('rejoin:failed');
        return;
      }
      if (game.status === 'finished') {
        // Still let them see the final results.
        const state = await buildPlayerState(pin, playerId);
        socket.emit('join:success', { pin, playerId, nickname: player.nickname, gameTitle: game.quizTitle });
        socket.emit('game:state', state);
        return;
      }

      await GameSession.updateOne(
        { pin, 'players.playerId': playerId },
        { $set: { 'players.$.socketId': socket.id, 'players.$.connected': true } }
      );

      socket.join(pin);
      socket.data.role = 'player';
      socket.data.pin = pin;
      socket.data.playerId = playerId;
      socket.data.nickname = player.nickname;

      const state = await buildPlayerState(pin, playerId);
      socket.emit('join:success', { pin, playerId, nickname: player.nickname, gameTitle: game.quizTitle, rejoined: true });
      socket.emit('game:state', state);

      const fresh = await GameSession.findOne({ pin });
      io.to(fresh.hostSocketId).emit('player:list', {
        players: publicPlayers(fresh),
        count: fresh.players.length,
      });
    } catch (err) {
      console.error('player:rejoin error', err);
      socket.emit('rejoin:failed');
    }
  });

  socket.on('answer:submit', async ({ pin, answerId, timestamp }) => {
    try {
      const result = await processAnswer(pin, socket.id, answerId, timestamp);
      if (!result) return;

      socket.emit('answer:result', {
        correct: result.isCorrect,
        points: result.points,
        rank: result.rank,
        score: result.score,
        streak: result.streak,
      });

      const game = await GameSession.findOne({ pin });
      if (!game) return;

      io.to(game.hostSocketId).emit('answer:received', {
        count: result.answeredCount,
        total: result.totalPlayers,
      });

      if (result.allAnswered) {
        await endQuestion(io, pin);
      }
    } catch (err) {
      console.error('answer:submit error', err);
    }
  });
}
