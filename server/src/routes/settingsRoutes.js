import { Router } from 'express';
import os from 'os';
import { getSettings, PUBLIC_SETTINGS_FIELDS } from '../models/Settings.js';

const router = Router();

/** First non-internal IPv4 address of this machine (for LAN QR links in dev). */
function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

// Public, read-only subset of settings used by the client UI.
router.get('/public', async (req, res) => {
  try {
    const settings = await getSettings();
    const result = {};
    for (const key of PUBLIC_SETTINGS_FIELDS) result[key] = settings[key];
    result.lanIp = getLanIp();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
