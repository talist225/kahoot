import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { playerSession } from '../../utils/storage';
import { celebrate, burst } from '../../utils/confetti';
import { t, formatNumber } from '../../i18n';
import Button from '../common/Button';
import Leaderboard from '../common/Leaderboard';
import Podium from '../common/Podium';
import ShareResults from '../common/ShareResults';

export default function PlayerResults() {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const results = state.finalResults;

  const me = results?.fullResults?.find((p) => (state.playerId && p.playerId === state.playerId) || p.nickname === state.nickname);

  useEffect(() => {
    if (!results) return;
    if (me?.rank === 1) celebrate(4000);
    else burst();
  }, [results]);

  if (!results) return null;

  const { podium, fullResults, pin } = results;
  const total = fullResults.length;

  function goHome() {
    playerSession.clear();
    dispatch({ type: 'RESET' });
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <motion.div
        className="text-center space-y-6 w-full max-w-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' }}
      >
        <h1 className="text-5xl font-black text-white text-shadow-lg">🏆 {t('gameOver')}</h1>
        {results.title && <p className="text-white/70 text-lg -mt-3">{results.title}</p>}

        {/* My personal card */}
        {me && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-5 shadow-2xl ${me.rank === 1 ? 'bg-kahoot-yellow' : me.rank <= 3 ? 'bg-kahoot-blue' : 'bg-white/15'}`}
          >
            <p className="text-white/90 text-lg font-semibold">{me.nickname}</p>
            <p className="text-white text-3xl font-black mt-1">
              {me.rank === 1 ? t('congratsWinner') : t('youFinished', { rank: me.rank, total })}
            </p>
            <div className="flex justify-center gap-6 mt-3 text-white">
              <div>
                <p className="text-xs text-white/70">{t('yourScore')}</p>
                <p className="text-2xl font-black ltr-nums">{formatNumber(me.score)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t('accuracy')}</p>
                <p className="text-2xl font-black ltr-nums">{me.accuracy}%</p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t('longestStreak')}</p>
                <p className="text-2xl font-black ltr-nums">{me.longestStreak}</p>
              </div>
            </div>
            <p className="text-white/80 text-sm mt-2">{t('correctOutOf', { correct: me.correctAnswers, total: me.totalQuestions })}</p>
          </motion.div>
        )}

        <Podium podium={podium} highlight={state.nickname} />

        {/* Full leaderboard – everyone sees everyone */}
        <div className="text-start">
          <h2 className="text-white font-bold text-xl mb-2">{t('fullLeaderboard')}</h2>
          <Leaderboard results={fullResults} highlight={state.nickname} highlightId={state.playerId} animateDelay={1} maxHeight="50vh" />
        </div>

        {pin && <ShareResults pin={pin} />}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="pb-8">
          <Button onClick={goHome}>🏠 {t('backToHome')}</Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
