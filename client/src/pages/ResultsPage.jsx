import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gameAPI, errorMessage } from '../utils/api';
import { t, formatDate } from '../i18n';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Leaderboard from '../components/common/Leaderboard';
import Podium from '../components/common/Podium';
import ShareResults from '../components/common/ShareResults';

/** Public, shareable results page for a finished game: /results/:pin */
export default function ResultsPage() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    gameAPI.getResults(pin)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err, t('gameNotFound'))); });
    return () => { cancelled = true; };
  }, [pin]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 text-center">
        <Logo size="md" />
        <p className="text-2xl text-white">{error}</p>
        <Button onClick={() => navigate('/')}>🏠 {t('backToHome')}</Button>
      </div>
    );
  }

  if (!data) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <motion.div className="w-full max-w-2xl space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center space-y-1">
          <Logo size="sm" />
          <h1 className="text-3xl sm:text-4xl font-black text-white text-shadow-lg mt-2">🏆 {t('resultsFor')}</h1>
          <p className="text-white/80 text-xl font-semibold">{data.title}</p>
          <p className="text-white/50 text-sm">
            {t('pin')}: <span className="ltr-nums">{data.pin}</span> · {data.playerCount} {t('players')} · {data.totalQuestions} {t('questions')}
          </p>
          <p className="text-white/50 text-sm">{t('endedAt', { date: formatDate(data.finishedAt) })}</p>
        </div>

        <Podium podium={data.podium} />

        <div>
          <h2 className="text-white font-bold text-xl mb-2">{t('fullLeaderboard')}</h2>
          <Leaderboard results={data.fullResults} />
        </div>

        <ShareResults pin={data.pin} />

        <div className="flex justify-center pb-8">
          <Button onClick={() => navigate('/')}>🏠 {t('backToHome')}</Button>
        </div>
      </motion.div>
    </div>
  );
}
