import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playCountdown, playGameStart } from '../../utils/sounds';
import { t } from '../../i18n';

export default function Countdown({ onComplete, text }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      playCountdown();
      const timer = setTimeout(() => setCount(count - 1), 800);
      return () => clearTimeout(timer);
    } else {
      playGameStart();
      const timer = setTimeout(() => onComplete?.(), 600);
      return () => clearTimeout(timer);
    }
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 bg-kahoot-purple z-50 flex flex-col items-center justify-center gap-6">
      {text && <p className="text-white/70 text-2xl font-semibold">{text}</p>}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-9xl font-black text-white text-shadow-lg ltr-nums"
        >
          {count > 0 ? count : t('go')}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
