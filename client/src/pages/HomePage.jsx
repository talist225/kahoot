import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';
import { t } from '../i18n';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
      <Logo size="xl" />

      <motion.p
        className="text-white/80 text-xl text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {t('homeTagline')}
      </motion.p>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 mt-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button size="xl" onClick={() => navigate('/play')}>
          🎯 {t('joinGame')}
        </Button>
        <Button size="xl" variant="secondary" onClick={() => navigate('/admin')}>
          🛠️ {t('adminPanel')}
        </Button>
      </motion.div>
    </div>
  );
}
