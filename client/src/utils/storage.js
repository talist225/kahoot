import { STORAGE_KEYS } from './constants';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  if (value == null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
}

export const playerSession = {
  get: () => read(STORAGE_KEYS.playerSession),
  set: (v) => write(STORAGE_KEYS.playerSession, v),
  clear: () => write(STORAGE_KEYS.playerSession, null),
};

export const hostSession = {
  get: () => read(STORAGE_KEYS.hostSession),
  set: (v) => write(STORAGE_KEYS.hostSession, v),
  clear: () => write(STORAGE_KEYS.hostSession, null),
};
