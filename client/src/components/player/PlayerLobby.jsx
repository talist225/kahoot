import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { t } from '../../i18n';

export default function PlayerLobby() {
  const { state } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        className="text-center space-y-6"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <motion.div
          className="text-6xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🎉
        </motion.div>

        <h1 className="text-4xl font-black text-white">{t('youreIn')}</h1>

        {state.nickname && (
          <p className="text-white/90 text-2xl font-bold bg-white/15 rounded-xl px-6 py-2 inline-block">
            {state.nickname}
          </p>
        )}

        <p className="text-xl text-white/80 font-semibold">
          {state.gameTitle || t('getReady')}
        </p>

        <div className="flex items-center justify-center gap-2">
          {[0, 0.3, 0.6].map((delay) => (
            <motion.div
              key={delay}
              className="w-3 h-3 bg-white rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay }}
            />
          ))}
        </div>

        <p className="text-white/50 text-lg">
          {state.hostAway ? t('hostDisconnectedWait') : state.inProgress ? t('lateJoinNotice') : t('waitingForHost')}
        </p>
        {!state.inProgress && !state.hostAway && (
          <p className="text-white/40 text-sm">{t('seeYourNameOnScreen')}</p>
        )}
      </motion.div>
    </div>
  );
}
