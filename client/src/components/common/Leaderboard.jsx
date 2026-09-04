import { motion } from 'framer-motion';
import { t, formatNumber } from '../../i18n';

const medals = ['🥇', '🥈', '🥉'];

/**
 * Full results table. `results` = array of { rank, nickname, score, accuracy?, correctAnswers?, totalQuestions?, longestStreak? }
 * `highlight` = nickname (or playerId) of the current player to emphasise.
 */
export default function Leaderboard({ results = [], highlight = null, highlightId = null, showDetails = true, animateDelay = 0, compact = false, maxHeight }) {
  if (!results.length) {
    return <p className="text-white/60 text-center py-6">{t('noPlayers')}</p>;
  }

  const hasDetails = showDetails && results.some((r) => r.accuracy != null);
  const cols = hasDetails
    ? 'grid-cols-[2.5rem_1fr_auto_auto] sm:grid-cols-[3rem_1fr_5rem_5rem_6rem]'
    : 'grid-cols-[2.5rem_1fr_auto]';

  return (
    <div className="w-full bg-white/10 backdrop-blur rounded-xl overflow-hidden" dir="rtl">
      <div className={`grid ${cols} gap-x-3 px-4 py-3 text-white/60 text-xs sm:text-sm font-semibold border-b border-white/10`}>
        <span>#</span>
        <span>{t('player')}</span>
        {hasDetails && <span className="text-center hidden sm:block">{t('correct')}</span>}
        {hasDetails && <span className="text-center">{t('accuracy')}</span>}
        <span className="text-end">{t('score')}</span>
      </div>

      <div className={`${maxHeight ? 'overflow-y-auto scrollbar-thin' : ''}`} style={maxHeight ? { maxHeight } : undefined}>
        {results.map((p, i) => {
          const isMe = (highlightId && p.playerId === highlightId) || (highlight && p.nickname === highlight);
          return (
            <motion.div
              key={p.playerId || `${p.nickname}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animateDelay + Math.min(i, 15) * 0.05 }}
              className={`grid ${cols} gap-x-3 px-4 ${compact ? 'py-2' : 'py-3'} items-center
                ${isMe ? 'bg-kahoot-yellow/40 ring-2 ring-inset ring-kahoot-yellow' : i % 2 === 0 ? 'bg-white/5' : ''}`}
            >
              <span className="text-white font-black text-lg ltr-nums">
                {p.rank <= 3 ? medals[p.rank - 1] : p.rank}
              </span>
              <span className={`text-white font-semibold truncate ${isMe ? 'font-black' : ''}`}>
                {p.nickname}
                {isMe && <span className="ms-2 text-xs bg-white/30 px-2 py-0.5 rounded-full">{t('yourPosition')}</span>}
              </span>
              {hasDetails && (
                <span className="text-white/80 text-sm text-center ltr-nums hidden sm:block">
                  {p.correctAnswers}/{p.totalQuestions}
                </span>
              )}
              {hasDetails && (
                <span className="text-white/80 text-sm text-center ltr-nums">{p.accuracy}%</span>
              )}
              <span className="text-white font-bold text-end ltr-nums">{formatNumber(p.score)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
