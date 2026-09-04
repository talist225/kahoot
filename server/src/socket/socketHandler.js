import GameSession from '../models/GameSession.js';
import { getSettings } from '../models/Settings.js';
import { registerHostEvents } from './hostEvents.js';
import { registerPlayerEvents } from './playerEvents.js';
import { setIO, startHostGrace, forceEndGame, publicPlayers } from './gameLogic.js';

export function setupSocketHandlers(io) {
  setIO(io);

  io.on('connection', (socket) => {
    registerHostEvents(io, socket);
    registerPlayerEvents(io, socket);

    socket.on('disconnect', async () => {
      try {
        // --- Host left: give them a grace period to come back before ending the game.
        const asHost = await GameSession.findOne({
          hostSocketId: socket.id,
          status: { $ne: 'finished' },
        });

        if (asHost) {
          const settings = await getSettings();
          const grace = settings.hostReconnectGraceSeconds ?? 30;
          io.to(asHost.pin).emit('host:disconnected', { graceSeconds: grace });
          startHostGrace(io, asHost.pin, grace, async () => {
            const stillOrphan = await GameSession.findOne({ pin: asHost.pin, hostSocketId: socket.id, status: { $ne: 'finished' } });
            if (stillOrphan) await forceEndGame(io, asHost.pin, 'host-disconnect');
          });
          return;
        }

        // --- Player left.
        const pin = socket.data.pin;
        const playerId = socket.data.playerId;
        if (!pin || !playerId) return;

        const game = await GameSession.findOne({ pin, status: { $ne: 'finished' } });
        if (!game) return;

        const player = game.players.find((p) => p.playerId === playerId);
        if (!player) return;

        if (game.status === 'lobby') {
          // In the lobby we simply drop them; they can join again fresh.
          game.players = game.players.filter((p) => p.playerId !== playerId);
          await game.save();
        } else {
          // Mid-game we keep their slot so they can reconnect and keep their score.
          await GameSession.updateOne(
            { pin, 'players.playerId': playerId },
            { $set: { 'players.$.connected': false } }
          );
        }

        const fresh = await GameSession.findOne({ pin });
        io.to(fresh.hostSocketId).emit('player:disconnected', {
          nickname: player.nickname,
          playerId,
          players: publicPlayers(fresh),
          count: fresh.players.length,
        });
      } catch (err) {
        console.error('disconnect handler error', err);
      }
    });
  });
}
