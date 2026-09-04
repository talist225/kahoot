import he from './he.js';

/**
 * Tiny translation helper. Usage: t('yourRank', { rank: 3 })
 * Missing keys fall back to the key itself so nothing renders blank.
 */
export function t(key, params) {
  let str = he[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function formatDate(value, withTime = true) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('he-IL');
}

export const STATUS_LABELS = {
  lobby: he.statusLobby,
  playing: he.statusPlaying,
  finished: he.statusFinished,
};

export const ENDED_BY_LABELS = {
  host: he.endedByHost,
  admin: he.endedByAdmin,
  'host-disconnect': he.endedByHostDisconnect,
  '': '—',
};

export default he;
