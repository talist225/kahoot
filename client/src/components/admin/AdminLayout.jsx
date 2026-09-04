import { NavLink, useNavigate } from 'react-router-dom';
import { t } from '../../i18n';
import Logo from '../common/Logo';

const nav = [
  { to: '/admin', label: t('dashboard'), icon: '📊', end: true },
  { to: '/admin/quizzes', label: t('quizzes'), icon: '📋' },
  { to: '/admin/games', label: t('games'), icon: '🎮' },
  { to: '/admin/settings', label: t('settings'), icon: '⚙️' },
];

export default function AdminLayout({ children, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (top bar on mobile) */}
      <aside className="md:w-60 bg-black/20 md:min-h-screen p-4 flex md:flex-col gap-3 items-center md:items-stretch justify-between md:justify-start">
        <button onClick={() => navigate('/')} className="text-start md:mb-6">
          <Logo size="sm" />
          <p className="text-white/50 text-xs mt-1 hidden md:block">{t('adminPanel')}</p>
        </button>

        <nav className="flex md:flex-col gap-1 md:gap-2 flex-1 overflow-x-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors
                 ${isActive ? 'bg-white text-kahoot-purple' : 'text-white/80 hover:bg-white/10'}`
              }
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button onClick={onLogout} className="text-white/60 hover:text-white text-sm whitespace-nowrap md:mt-auto">
          ⎋ {t('logout')}
        </button>
      </aside>

      <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
