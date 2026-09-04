import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import { useSettings } from '../../context/SettingsContext';
import { useTimer } from '../../hooks/useTimer';
import { ANSWER_CONFIG } from '../../utils/constants';
import { t, formatNumber } from '../../i18n';
import Timer from '../common/Timer';
import Button from '../common/Button';

export default function HostGameView() {
  const { socket } = useSocket();
  const { state } = useGame();
  const { settings } = useSettings();
  const { currentQuestion: q, questionIndex, totalQuestions, status, answeredCount, questionResults, players, leaderboard } = state;

  const handleTimeout = useCallback(() => {}, []);
  const { timeLeft, progress, start } = useTimer(state.timeLimit || q?.timeLimit || 20, handleTimeout);

  useEffect(() => {
    if (q && status === 'question') start();
  }, [questionIndex, status]);

  const emit = (evt) => socket && socket.emit(evt, { pin: state.pin });

  function handleEndGame() {
    if (confirm(t('endGameConfirm'))) emit('game:end');
  }

  if (!q) return null;

  const showResults = status === 'results' && questionResults;
  const isLast = questionIndex + 1 >= totalQuestions;
  const connectedPlayers = players.filter((p) => p.connected !== false).length || players.length;

  // ---- Leaderboard screen between questions
  if (status === 'leaderboard' && leaderboard) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar questionIndex={questionIndex} totalQuestions={totalQuestions} onEndGame={handleEndGame} />
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8">
          <h2 className="text-5xl font-black text-white text-shadow-lg">🏆 {t('leaderboard')}</h2>
          <div className="w-full max-w-2xl space-y-3">
            {leaderboard.top5.map((p, i) => (
              <motion.div
                key={p.playerId || p.nickname}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-center gap-4 bg-white/15 rounded-xl px-6 py-4"
              >
                <span className="text-3xl font-black text-white w-10 ltr-nums">{p.rank}</span>
                <span className="flex-1 text-2xl font-bold text-white truncate">{p.nickname}</span>
                <span className="text-2xl font-black text-white ltr-nums">{formatNumber(p.score)}</span>
              </motion.div>
            ))}
          </div>
          <Button variant="primary" size="lg" onClick={() => emit('question:next')}>
            {isLast ? `🏆 ${t('seeResults')}` : `${t('next')} ←`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="bg-white/10 h-2">
        <motion.div className="bg-white h-full" initial={{ width: 0 }} animate={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} />
      </div>

      <TopBar
        questionIndex={questionIndex}
        totalQuestions={totalQuestions}
        onEndGame={handleEndGame}
        right={status === 'question' && (
          <div className="flex items-center gap-3">
            <span className="text-white/60 font-semibold">{t('answered', { count: answeredCount, total: connectedPlayers })}</span>
            <button onClick={() => emit('question:end')} className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg">
              ⏭ {t('endQuestion')}
            </button>
          </div>
        )}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${questionIndex}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center w-full max-w-4xl"
          >
            <div className="flex flex-col items-center gap-6 mb-8">
              {status === 'question' && <Timer timeLeft={timeLeft} progress={progress} size="lg" />}
              <h2 className="text-3xl sm:text-5xl font-black text-white text-shadow-lg">{q.text}</h2>
              {q.image && <img src={q.image} alt={t('questionImageAlt')} className="max-h-60 rounded-xl shadow-lg" />}
            </div>

            {/* Answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {q.answers.map((answer, i) => {
                const config = ANSWER_CONFIG[i];
                const isCorrect = showResults && questionResults.correctAnswerIndex === i;
                const count = showResults ? questionResults.answerCounts[i] : 0;

                return (
                  <motion.div
                    key={i}
                    className={`rounded-xl p-5 flex items-center gap-4 relative overflow-hidden ${showResults && !isCorrect ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: config.color }}
                    animate={isCorrect ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-white text-3xl w-10">{config.label}</span>
                    <span className="text-white text-xl font-bold flex-1 text-start">{answer.text}</span>
                    {showResults && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white/30 text-white text-xl font-black px-3 py-1 rounded-lg ltr-nums">
                        {count}
                      </motion.span>
                    )}
                    {isCorrect && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl">✓</motion.span>}
                  </motion.div>
                );
              })}
            </div>

            {/* Results bar chart */}
            {showResults && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-end gap-4 h-32" dir="ltr">
                  {questionResults.answerCounts.map((count, i) => {
                    const maxCount = Math.max(...questionResults.answerCounts, 1);
                    const height = Math.max((count / maxCount) * 100, 4);
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.1 }}
                        className="w-16 rounded-t-lg relative"
                        style={{ backgroundColor: ANSWER_CONFIG[i].color }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-white font-bold ltr-nums">{count}</span>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-white/60 text-lg">
                  {t('correctCount', { count: questionResults.correctCount, total: questionResults.totalPlayers })}
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                  {settings.showLeaderboardBetweenQuestions !== false && (
                    <Button variant="secondary" size="lg" onClick={() => emit('leaderboard:show')}>
                      🏆 {t('showLeaderboard')}
                    </Button>
                  )}
                  <Button variant="primary" size="lg" onClick={() => emit('question:next')}>
                    {isLast ? `🏆 ${t('seeResults')}` : `${t('next')} ←`}
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TopBar({ questionIndex, totalQuestions, onEndGame, right }) {
  return (
    <div className="flex items-center justify-between p-4 gap-4">
      <div className="flex items-center gap-4">
        <span className="text-white/60 font-bold">{t('questionOf', { index: questionIndex + 1, total: totalQuestions })}</span>
        <button onClick={onEndGame} className="text-white/40 hover:text-white text-xs underline">{t('endGame')}</button>
      </div>
      {right}
    </div>
  );
}
