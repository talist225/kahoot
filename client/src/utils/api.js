import axios from 'axios';
import { STORAGE_KEYS } from './constants';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ---- admin token handling ----
export function getAdminToken() {
  return localStorage.getItem(STORAGE_KEYS.adminToken);
}
export function setAdminToken(token) {
  if (token) localStorage.setItem(STORAGE_KEYS.adminToken, token);
  else localStorage.removeItem(STORAGE_KEYS.adminToken);
}

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unauthorizedListeners = new Set();
export function onUnauthorized(fn) {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getAdminToken()) {
      setAdminToken(null);
      unauthorizedListeners.forEach((fn) => fn());
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'שגיאה') {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors.join(', ');
  if (data?.error) return data.error;
  return err?.message || fallback;
}

export const quizAPI = {
  getAll: () => api.get('/quizzes'),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  duplicate: (id) => api.post(`/quizzes/${id}/duplicate`),
  import: (quizzes) => api.post('/quizzes/import', { quizzes }),
};

export const gameAPI = {
  create: (quizId) => api.post('/games/create', { quizId }),
  getByPin: (pin) => api.get(`/games/${pin}`),
  getResults: (pin) => api.get(`/games/${pin}/results`),
};

export const settingsAPI = {
  getPublic: () => api.get('/settings/public'),
};

export const adminAPI = {
  login: (password) => api.post('/admin/login', { password }),
  verify: () => api.get('/admin/verify'),
  stats: () => api.get('/admin/stats'),
  games: (params) => api.get('/admin/games', { params }),
  game: (id) => api.get(`/admin/games/${id}`),
  deleteGame: (id) => api.delete(`/admin/games/${id}`),
  endGame: (id) => api.post(`/admin/games/${id}/end`),
  kickPlayer: (id, playerId) => api.post(`/admin/games/${id}/kick`, { playerId }),
  clearFinished: (olderThanDays) => api.post('/admin/games/clear-finished', { olderThanDays }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  exportUrl: () => '/api/admin/export',
  export: () => api.get('/admin/export', { responseType: 'blob' }),
  uploadBubbleImage: (dataUri) => api.post('/admin/settings/bubble-image', { dataUri }),
  deleteBubbleImage: (index) => api.delete(`/admin/settings/bubble-image/${index}`),
};

export default api;
