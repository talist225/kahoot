import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { adminAPI, getAdminToken, setAdminToken, onUnauthorized } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { t } from '../i18n';
import AdminLogin from '../components/admin/AdminLogin';
import AdminLayout from '../components/admin/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminQuizzes from '../components/admin/AdminQuizzes';
import AdminGames from '../components/admin/AdminGames';
import AdminGameDetails from '../components/admin/AdminGameDetails';
import AdminSettings from '../components/admin/AdminSettings';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setAuthed(false); return; }
    adminAPI.verify()
      .then(() => setAuthed(true))
      .catch(() => { setAdminToken(null); setAuthed(false); });
  }, []);

  useEffect(() => onUnauthorized(() => {
    setAuthed(false);
    toast(t('sessionExpired'), 'warning');
  }), [toast]);

  function handleLoggedIn() {
    setAuthed(true);
    const next = searchParams.get('next');
    if (next && next.startsWith('/')) navigate(next, { replace: true });
  }

  function handleLogout() {
    setAdminToken(null);
    setAuthed(false);
    navigate('/admin', { replace: true });
  }

  if (authed === null) return <LoadingSpinner fullScreen />;
  if (!authed) return <AdminLogin onSuccess={handleLoggedIn} />;

  return (
    <AdminLayout onLogout={handleLogout}>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="quizzes/*" element={<AdminQuizzes />} />
        <Route path="games" element={<AdminGames />} />
        <Route path="games/:id" element={<AdminGameDetails />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
