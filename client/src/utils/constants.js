export const ANSWER_COLORS = {
  red: '#E21B3C',
  blue: '#1368CE',
  yellow: '#D89E00',
  green: '#26890C',
};

export const ANSWER_SHAPES = ['triangle', 'diamond', 'circle', 'square'];

export const ANSWER_CONFIG = [
  { color: ANSWER_COLORS.red, shape: 'triangle', label: '▲' },
  { color: ANSWER_COLORS.blue, shape: 'diamond', label: '◆' },
  { color: ANSWER_COLORS.yellow, shape: 'circle', label: '●' },
  { color: ANSWER_COLORS.green, shape: 'square', label: '■' },
];

export const TIME_LIMITS = [5, 10, 20, 30, 60, 90, 120];

export const POINT_OPTIONS = [
  { value: 1000, labelKey: 'pointsStandard' },
  { value: 2000, labelKey: 'pointsDouble' },
  { value: 0, labelKey: 'pointsNone' },
];

export const CONFETTI_COLORS = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'];

/**
 * Socket.IO server URL.
 * - explicit VITE_SERVER_URL wins;
 * - in Vite dev (port 5173) use the same hostname on port 3001 — this makes the
 *   QR link work from phones on the LAN (not "localhost" of the phone);
 * - in production (client served by the Node server) use the same origin.
 */
export const SERVER_URL = (() => {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  const { protocol, hostname, port, origin } = window.location;
  if (import.meta.env.DEV || port === '5173') return `${protocol}//${hostname}:3001`;
  return origin;
})();

// localStorage keys
export const STORAGE_KEYS = {
  adminToken: 'kahoot.adminToken',
  playerSession: 'kahoot.playerSession', // { pin, playerId, nickname }
  hostSession: 'kahoot.hostSession',     // { pin, quizId }
};
