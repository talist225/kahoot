import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, setAdminToken, errorMessage } from '../../utils/api';
import { t } from '../../i18n';
import Logo from '../common/Logo';

export default function AdminLogin({ onSuccess }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await adminAPI.login(password);
      setAdminToken(data.token);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.status === 401 ? t('wrongPassword') : errorMessage(err, t('serverError')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div className="w-full max-w-sm space-y-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center"><Logo size="md" /></div>

        <form onSubmit={submit} className="bg-white rounded-xl p-6 space-y-4 shadow-2xl">
          <h1 className="text-2xl font-black text-gray-800 text-center">🔐 {t('adminLogin')}</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminPassword')}
            autoFocus
            autoComplete="current-password"
            className="w-full text-center text-xl font-bold text-gray-800 bg-gray-100 rounded-lg py-3 outline-none focus:ring-4 focus:ring-kahoot-purple/50 placeholder-gray-400"
          />
          {error && <p className="text-kahoot-red text-center font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={!password || busy}
            className="w-full bg-kahoot-purple text-white text-xl font-bold py-3 rounded-lg hover:bg-purple-800 disabled:opacity-40 transition-colors"
          >
            {busy ? t('loggingIn') : t('login')}
          </button>
          <p className="text-gray-400 text-xs text-center">{t('adminPasswordNote')}</p>
        </form>

        <div className="text-center">
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">→ {t('backToHome')}</button>
        </div>
      </motion.div>
    </div>
  );
}
