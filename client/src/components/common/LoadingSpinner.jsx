import { motion } from 'framer-motion';
import { t } from '../../i18n';

export default function LoadingSpinner({ text, fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-white text-lg font-semibold">{text ?? t('loading')}</p>
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center">{content}</div>;
  }
  return content;
}
