import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, errorMessage } from '../../utils/api';
import { t, formatDate, formatNumber, STATUS_LABELS } from '../../i18n';
import LoadingSpinner from '../common/LoadingSpinner';
import Button from '../common/Button';

const statusColor = { lobby: 'bg-kahoot-yellow', playing: 'bg-kahoot-green', finished: 'bg-white/20' };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await adminAPI.stats();
      setStats(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  if (error) return <p className="text-kahoot-red font-bold">{error}</p>;
  if (!stats) return <LoadingSpinner />;

  const cards = [
    { label: t('totalQuizzes'), value: stats.quizCount, icon: '📋', to: '/admin/quizzes' },
    { label: t('activeGames'), value: stats.activeGames, icon: '🟢', to: '/admin/games?status=active' },
    { label: t('finishedGames'), value: stats.finishedGames, icon: '🏁', to: '/admin/games?status=finished' },
    { label: t('totalGames'), value: stats.totalGames, icon: '🎮', to: '/admin/games' },
    { label: t('totalPlayers'), value: stats.totalPlayers, icon: '👥' },
    { label: t('gamesLast7Days'), value: stats.gamesLast7Days, icon: '📅' },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">{t('dashboard')}</h1>
        <Button size="sm" variant="secondary" onClick={load}>↻ {t('refresh')}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const inner = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-5 h-full"
            >
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-4xl font-black text-white ltr-nums">{formatNumber(c.value)}</div>
              <div className="text-white/60 text-sm mt-1">{c.label}</div>
            </motion.div>
          );
          return c.to ? <Link key={c.label} to={c.to}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white/10 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">{t('recentGames')}</h2>
          {stats.recentGames.length === 0 ? (
            <p className="text-white/50">{t('noGames')}</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentGames.map((g) => (
                <li key={g._id}>
                  <Link to={`/admin/games/${g._id}`} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusColor[g.status]}`}>{STATUS_LABELS[g.status]}</span>
                    <span className="flex-1 text-white font-semibold truncate">{g.quizTitle || '—'}</span>
                    <span className="text-white/60 text-sm ltr-nums">{g.pin}</span>
                    <span className="text-white/60 text-sm">{g.playerCount} 👥</span>
                    <span className="text-white/40 text-xs hidden sm:inline">{formatDate(g.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white/10 rounded-xl p-5">
          <h2 className="text-xl font-bold text-white mb-4">{t('topQuizzes')}</h2>
          {stats.topQuizzes.length === 0 ? (
            <p className="text-white/50">—</p>
          ) : (
            <ul className="space-y-2">
              {stats.topQuizzes.map((q, i) => (
                <li key={q._id || i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/60 font-black w-6 ltr-nums">{i + 1}</span>
                  <span className="flex-1 text-white font-semibold truncate">{q.title || '—'}</span>
                  <span className="text-white/60 text-sm">{q.plays} {t('plays')}</span>
                  <span className="text-white/60 text-sm">{q.players} 👥</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
