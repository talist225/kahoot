import { Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import HomePage from './pages/HomePage';
import HostPage from './pages/HostPage';
import PlayPage from './pages/PlayPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import BubblesBackground from './components/common/BubblesBackground';

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <SocketProvider>
          <GameProvider>
            <div className="min-h-screen bg-kahoot-purple relative" dir="rtl">
              <BubblesBackground />
              <div className="relative" style={{ zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/play" element={<PlayPage />} />
                <Route path="/join/:pin" element={<PlayPage />} />
                <Route path="/host/:quizId" element={<HostPage />} />
                <Route path="/results/:pin" element={<ResultsPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
                <Route path="/create" element={<Navigate to="/admin/quizzes" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </div>
            </div>
          </GameProvider>
        </SocketProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
