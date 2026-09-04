import { motion } from 'framer-motion';
import { formatNumber } from '../../i18n';

const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
const podiumHeights = ['h-44 sm:h-48', 'h-32 sm:h-36', 'h-24 sm:h-28'];
// visual order (RTL flex reverses it, so this keeps 1st in the middle)
const podiumOrder = [1, 0, 2];

export default function Podium({ podium = [], highlight = null }) {
  if (!podium.length) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6" dir="ltr">
      {podiumOrder.map((orderIdx) => {
        const player = podium[orderIdx];
        if (!player) return <div key={orderIdx} className="w-24 sm:w-32" />;
        const isMe = highlight && player.nickname === highlight;

        return (
          <motion.div
            key={orderIdx}
            className="flex flex-col items-center"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + orderIdx * 0.3, type: 'spring' }}
          >
            <motion.div
              className="text-4xl sm:text-5xl mb-2"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: orderIdx * 0.3 }}
            >
              {orderIdx === 0 ? '👑' : orderIdx === 1 ? '🥈' : '🥉'}
            </motion.div>
            <p className={`text-white font-bold text-lg sm:text-xl truncate max-w-[120px] ${isMe ? 'underline decoration-kahoot-yellow decoration-4' : ''}`} dir="rtl">
              {player.nickname}
            </p>
            <p className="text-white/80 font-semibold mb-2 ltr-nums">{formatNumber(player.score)}</p>
            <div
              className={`w-24 sm:w-32 ${podiumHeights[orderIdx]} rounded-t-xl flex items-start justify-center pt-4 shadow-lg`}
              style={{ backgroundColor: podiumColors[orderIdx] }}
            >
              <span className="text-3xl sm:text-4xl font-black text-white/90">{player.rank}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
