import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';

const colors = ['text-kahoot-red', 'text-kahoot-blue', 'text-kahoot-yellow', 'text-white', 'text-kahoot-green'];

export default function Logo({ size = 'lg' }) {
  const { settings } = useSettings();
  const sizes = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
    xl: 'text-8xl',
  };

  const name = settings.siteName || 'קהוט!';
  const chars = Array.from(name);

  return (
    <motion.h1
      className={`${sizes[size]} font-black text-white text-shadow-lg select-none whitespace-nowrap`}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      {chars.map((ch, i) => (
        <span key={i} className={ch === ' ' ? '' : colors[i % colors.length]}>
          {ch}
        </span>
      ))}
    </motion.h1>
  );
}
