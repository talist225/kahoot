import { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import { useTimer } from '../../hooks/useTimer';
import { ANSWER_CONFIG } from '../../utils/constants';
import { playCorrect, playWrong } from '../../utils/sounds';
import { t, formatNumber } from '../../i18n';
import Timer from '../common/Timer';

export default function PlayerGameView() {
  const { socket } = useSocket();
  const { state, dispatch } = useGame();
  const { currentQuestion: q, questionIndex, totalQuestions, status, selectedAnswer, answerResult, revealed, leaderboard, nickname, myScore, hostAway } = state;
  const startTimeRef = useRef(null);
  const soundPlayedRef = useRef(null);

  const handleTimeout = useCallback(() => {}, []);
  const { timeLeft, progress, start } = useTimer(state.timeLimit || q?.timeLimit || 20, handleTimeout);

  useEffect(() => {
    if (q && status === 'question') {
      start();
      startTimeRef.current = Date.now();
    }
  }, [questionIndex, status]);

  useEffect(() => {
    if (answerResult && soundPlayedRef.current !== questionIndex) {
      soundPlayedRef.current = questionIndex;
      answerResult.correct ? playCorrect() : playWrong();
    }
  }, [answerResult, questionIndex]);

  function handleAnswer(answerId) {
    if (selectedAnswer !== null || !socket || status !== 'question') return;
    const timestamp = Date.now() - (startTimeRef.current || Date.now());
    dispatch({ type: 'SELECT_ANSWER', answerId });
    socket.emit('answer:submit', { pin: state.pin, answerId, timestamp });
  }

  if (!q) return null;

  const header = (
    <div className="flex items-center justify-between px-4 py-3 text-white/80 font-semibold text-sm sm:text-base">
      <span>{t('questionOf', { index: questionIndex + 1, total: totalQuestions })}</span>
      <span className="truncate max-w-[40%]">{nickname}</span>
      <span className="bg-white/20 rounded-lg px-3 py-1 ltr-nums">{formatNumber(myScore)}</span>
    </div>
  );

  // ---- Leaderboard between questions
  if (status === 'leaderboard' && leaderboard) {
    const me = leaderboard.players?.find((p) => p.nickname === nickname);
    return (
      <div className="min-h-screen flex flex-col">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          <h2 className="text-4xl font-black text-white text-shadow-lg">🏆 {t('leaderboard')}</h2>
          <div className="w-full max-w-md space-y-2">
            {leaderboard.top5.map((p, i) => (
              <motion.div
                key={p.playerId || p.nickname}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${p.nickname === nickname ? 'bg-kahoot-yellow text-white' : 'bg-white/15 text-white'}`}
              >
                <span className="text-2xl font-black w-8 ltr-nums">{p.rank}</span>
                <span className="flex-1 font-bold text-lg truncate">{p.nickname}</span>
                <span className="font-black ltr-nums">{formatNumber(p.score)}</span>
              </motion.div>
            ))}
          </div>
          {me && me.rank > 5 && (
            <div className="bg-kahoot-yellow rounded-xl px-6 py-3 text-white font-bold text-lg">
              {t('yourRank', { rank: me.rank })} · {formatNumber(me.score)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Waiting for result after answering
  if (selectedAnswer !== null && !answerResult) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: (ANSWER_CONFIG[selectedAnswer]?.color || '#46178F') + 'DD' }}>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div className="text-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <motion.div
              className="text-8xl mb-4"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              ⏳
            </motion.div>
            <p className="text-white text-2xl font-bold">{t('waitingForOthers')}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- Result of this question
  if (answerResult) {
    const correctIdx = revealed?.correctAnswerIndex;
    const correctText = correctIdx != null ? q.answers[correctIdx]?.text : null;
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: answerResult.correct ? '#26890Cdd' : '#E21B3Cdd' }}>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div
            className="text-center space-y-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <motion.div
              className="text-8xl"
              animate={answerResult.correct ? { rotate: [0, 10, -10, 0] } : { x: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {answerResult.correct ? '✅' : answerResult.timedOut ? '⌛' : '❌'}
            </motion.div>
            <h2 className="text-4xl font-black text-white">
              {answerResult.timedOut ? t('timesUp') : answerResult.correct ? t('correctAnswer') : t('wrongAnswer')}
            </h2>
            {answerResult.correct && (
              <motion.p className="text-6xl font-black text-white ltr-nums" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                +{formatNumber(answerResult.points)}
              </motion.p>
            )}
            {answerResult.correct && answerResult.streak > 1 && (
              <p className="text-white/90 font-bold">🔥 {t('streak', { count: answerResult.streak })}</p>
            )}
            {!answerResult.correct && correctText && (
              <div className="bg-white/20 rounded-xl px-5 py-3 text-white">
                <p className="text-sm text-white/80">{t('correctAnswerWas')}</p>
                <p className="font-bold text-xl">
                  <span className="me-2">{ANSWER_CONFIG[correctIdx]?.label}</span>{correctText}
                </p>
              </div>
            )}
            {answerResult.rank > 0 && (
              <p className="text-white/90 text-xl font-semibold">{t('yourRank', { rank: answerResult.rank })}</p>
            )}
            {answerResult.score != null && (
              <p className="text-white/80 text-lg">{t('totalScore', { score: formatNumber(answerResult.score) })}</p>
            )}
            {hostAway && <p className="text-white/70 text-sm mt-4">{t('hostDisconnectedWait')}</p>}
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- Question: answer buttons
  return (
    <div className="min-h-screen flex flex-col">
      {header}
      <div className="flex justify-center py-2">
        <Timer timeLeft={timeLeft} progress={progress} size="sm" />
      </div>
      <p className="text-white text-center font-bold text-lg px-4 pb-2 line-clamp-3">{q.text}</p>

      <div className="grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3 mt-auto mb-auto max-w-xl w-full mx-auto">
        {q.answers.map((answer, i) => {
          const config = ANSWER_CONFIG[i];
          return (
            <motion.button
              key={i}
              onClick={() => handleAnswer(i)}
              className="rounded-lg flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-3 cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: config.color }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="text-white text-lg sm:text-2xl shrink-0">{config.label}</span>
              <span className="text-white text-xs sm:text-base font-bold leading-tight text-start">{answer.text}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
