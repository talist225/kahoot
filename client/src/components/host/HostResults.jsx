import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useGame } from '../../context/GameContext';
import { useSettings } from '../../context/SettingsContext';
import { getResultsUrl } from '../../utils/urls';
import { celebrate } from '../../utils/confetti';
import { t } from '../../i18n';
import Button from '../common/Button';
import Leaderboard from '../common/Leaderboard';
import Podium from '../common/Podium';
import ShareResults from '../common/ShareResults';

export default function HostResults({ quizId }) {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { settings } = useSettings();
  const results = state.finalResults;

  useEffect(() => { celebrate(3000); }, []);

  if (!results) return null;

  const { podium, fullResults, pin } = results;
  const resultsUrl = getResultsUrl(settings, pin || state.pin);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <motion.h1
        className="text-5xl sm:text-6xl font-black text-white text-shadow-lg mb-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        🏆 {t('finalResults')}
      </motion.h1>
      {(results.title || state.gameTitle) && (
        <p className="text-white/70 text-xl mb-8">{results.title || state.gameTitle}</p>
      )}

      <div className="mb-12">
        <Podium podium={podium} />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div>
          <h2 className="text-white font-bold text-xl mb-2">{t('fullLeaderboard')}</h2>
          <Leaderboard results={fullResults} animateDelay={1.2} />
        </div>

        <motion.div
          className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-gray-700 font-bold">{t('shareResults')}</p>
          <QRCode value={resultsUrl} size={160} />
          <p className="text-gray-400 text-xs">{t('resultsSaved')}</p>
        </motion.div>
      </div>

      <div className="w-full max-w-4xl mt-6">
        <ShareResults pin={pin || state.pin} />
      </div>

      <motion.div className="flex flex-wrap justify-center gap-4 mt-8 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
        <Button onClick={() => { dispatch({ type: 'RESET' }); navigate('/admin'); }}>
          🛠️ {t('adminPanel')}
        </Button>
        <Button variant="success" onClick={() => { dispatch({ type: 'RESET' }); navigate(`/host/${quizId}?new=${Date.now()}`); }}>
          🔄 {t('playAgain')}
        </Button>
        <Button variant="secondary" onClick={() => { dispatch({ type: 'RESET' }); navigate('/admin/quizzes'); }}>
          📋 {t('quizzes')}
        </Button>
      </motion.div>
    </div>
  );
}
