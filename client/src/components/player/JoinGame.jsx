import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { gameAPI } from '../../utils/api';
import { t } from '../../i18n';
import Logo from '../common/Logo';

export default function JoinGame({ initialPin = '' }) {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [gameInfo, setGameInfo] = useState(null); // { title, status, locked, playerCount } | { notFound: true }
  const nickRef = useRef(null);
  const timeoutRef = useRef(null);

  const fromQr = !!initialPin && pin === initialPin;

  // Look up the game as soon as we have a 6-digit PIN, so the player gets instant feedback.
  useEffect(() => {
    if (pin.length !== 6) { setGameInfo(null); return; }
    let cancelled = false;
    setGameInfo({ loading: true });
    gameAPI.getByPin(pin)
      .then(({ data }) => { if (!cancelled) setGameInfo(data); })
      .catch(() => { if (!cancelled) setGameInfo({ notFound: true }); });
    return () => { cancelled = true; };
  }, [pin]);

  useEffect(() => {
    if (initialPin && nickRef.current) nickRef.current.focus();
  }, [initialPin]);

  // Re-enable the button if the server never answered (e.g. offline).
  useEffect(() => {
    if (!socket) return;
    const stop = () => { setJoining(false); clearTimeout(timeoutRef.current); };
    socket.on('join:error', stop);
    socket.on('join:success', stop);
    return () => { socket.off('join:error', stop); socket.off('join:success', stop); };
  }, [socket]);

  function handleJoin(e) {
    e.preventDefault();
    if (!pin || pin.length !== 6 || !nickname.trim() || !socket) return;
    setJoining(true);
    socket.emit('player:join', { pin, nickname: nickname.trim() });
    timeoutRef.current = setTimeout(() => setJoining(false), 5000);
  }

  const canJoin = pin.length === 6 && nickname.trim() && !joining && connected && !gameInfo?.notFound;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <Logo size="md" />
        </div>

        <form onSubmit={handleJoin} className="bg-white rounded-xl p-6 space-y-4 shadow-2xl">
          <div className="space-y-1">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder={t('gamePin')}
              aria-label={t('gamePin')}
              dir="ltr"
              className="w-full text-center text-3xl font-black tracking-[0.3em] text-gray-800 bg-gray-100 rounded-lg py-4 outline-none focus:ring-4 focus:ring-kahoot-purple/50 placeholder-gray-400 placeholder:tracking-normal"
              autoFocus={!initialPin}
            />
            <p className="text-center text-sm min-h-[1.25rem]">
              {gameInfo?.loading && <span className="text-gray-400">{t('checkingGame')}</span>}
              {fromQr && gameInfo?.title && (
                <span className="text-kahoot-green font-semibold">{t('pinFromQr')}</span>
              )}
              {gameInfo?.notFound && <span className="text-kahoot-red font-semibold">{t('gameNotFound')}</span>}
              {gameInfo?.title && !fromQr && (
                <span className="text-kahoot-purple font-semibold">{t('gameFoundJoinNow', { title: gameInfo.title })}</span>
              )}
              {gameInfo?.title && fromQr && (
                <span className="block text-kahoot-purple font-semibold">{gameInfo.title}</span>
              )}
              {gameInfo?.locked && <span className="block text-kahoot-red">{t('gameLockedShort')}</span>}
              {gameInfo?.status === 'playing' && <span className="block text-kahoot-yellow">{t('gameInProgress')}</span>}
            </p>
          </div>

          <input
            ref={nickRef}
            type="text"
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('enterNickname')}
            aria-label={t('nickname')}
            className="w-full text-center text-xl font-bold text-gray-800 bg-gray-100 rounded-lg py-3 outline-none focus:ring-4 focus:ring-kahoot-purple/50 placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={!canJoin}
            className="w-full bg-gray-800 text-white text-xl font-bold py-4 rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {joining ? t('joining') : t('enter')}
          </button>

          {!connected && <p className="text-center text-sm text-kahoot-red">{t('reconnecting')}</p>}
        </form>

        <p className="text-center text-white/50 text-sm">{t('joinHint')}</p>

        <div className="text-center">
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
            → {t('backToHome')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
