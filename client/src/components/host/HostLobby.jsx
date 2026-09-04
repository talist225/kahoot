import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import { useSettings } from '../../context/SettingsContext';
import { playPlayerJoin } from '../../utils/sounds';
import { hostSession } from '../../utils/storage';
import { getJoinUrl, getPublicBaseUrl, displayHost } from '../../utils/urls';
import { t } from '../../i18n';
import Button from '../common/Button';

export default function HostLobby() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  const joinUrl = getJoinUrl(settings, state.pin);
  const playHost = `${displayHost(getPublicBaseUrl(settings))}/play`;
  const prevCountRef = useRef(state.players.length);

  useEffect(() => {
    if (state.players.length > prevCountRef.current) playPlayerJoin();
    prevCountRef.current = state.players.length;
  }, [state.players.length]);

  function handleStart() {
    if (!socket || state.players.length === 0) return;
    socket.emit('game:start', { pin: state.pin });
  }

  function handleKick(player) {
    if (!socket) return;
    socket.emit('player:kick', { pin: state.pin, playerId: player.playerId, socketId: player.socketId });
  }

  function handleLock() {
    if (!socket) return;
    socket.emit('game:lock', { pin: state.pin });
  }

  function handleCancel() {
    if (!socket) return;
    if (!confirm(t('endGameConfirm'))) return;
    socket.emit('game:end', { pin: state.pin });
    hostSession.clear();
    dispatch({ type: 'RESET' });
    navigate('/admin/quizzes');
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between text-white/70 text-sm">
          <span className="font-semibold truncate">{state.gameTitle && t('quizTitleLabel', { title: state.gameTitle })}</span>
          <button onClick={handleCancel} className="hover:text-white underline">{t('endGame')}</button>
        </div>

        {/* PIN + QR */}
        <motion.div
          className="bg-white rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 shadow-2xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <p className="text-gray-500 text-base sm:text-lg font-semibold">
              {t('joinAt', { url: '' })}
              <span className="ltr-nums font-black text-kahoot-purple" dir="ltr">{playHost}</span>
            </p>
            <p className="text-gray-400 text-sm mt-3">{t('gamePin')}</p>
            <h1 className="text-6xl sm:text-8xl font-black text-gray-900 tracking-[0.2em] ltr-nums leading-none" dir="ltr">
              {state.pin}
            </h1>
          </div>
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <div className="bg-white p-2 rounded-xl border-4 border-kahoot-purple/10">
              <QRCode value={joinUrl} size={180} level="M" />
            </div>
            <p className="text-gray-500 text-sm font-semibold">{t('scanQr')}</p>
          </motion.div>
        </motion.div>

        {state.locked && (
          <p className="text-center text-kahoot-yellow font-bold">🔒 {t('lockedNotice')}</p>
        )}

        {/* Player Count */}
        <div className="text-center flex items-baseline justify-center gap-3">
          <span className="text-5xl font-black text-white ltr-nums">{state.players.length}</span>
          <span className="text-xl text-white/60">{t('players')}</span>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 min-h-[100px]">
          <AnimatePresence>
            {state.players.length === 0 && (
              <motion.p key="empty" className="col-span-full text-center text-white/40 text-lg py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t('waitingForPlayers')}
              </motion.p>
            )}
            {state.players.map((player) => (
              <motion.div
                key={player.playerId || player.socketId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`bg-white/20 backdrop-blur rounded-lg p-3 text-center relative group ${player.connected === false ? 'opacity-50' : ''}`}
              >
                <p className="text-white font-bold text-lg truncate">{player.nickname}</p>
                {player.connected === false && <p className="text-white/60 text-xs">{t('playerDisconnectedShort')}</p>}
                <button
                  onClick={() => handleKick(player)}
                  title={t('kickPlayer')}
                  aria-label={t('kickPlayer')}
                  className="absolute -top-2 -start-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pb-8">
          <Button variant="success" size="xl" disabled={state.players.length === 0} onClick={handleStart}>
            🚀 {t('start')}
          </Button>
          <Button variant="secondary" size="md" onClick={handleLock}>
            {state.locked ? `🔓 ${t('unlock')}` : `🔒 ${t('lock')}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
