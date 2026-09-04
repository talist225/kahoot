import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SECRET = process.env.ADMIN_SECRET || crypto.createHash('sha256').update(`kahoot-admin:${ADMIN_PASSWORD}`).digest('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD not set in .env — using default "admin123". Change it before going live!');
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function checkPassword(password) {
  if (typeof password !== 'string') return false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function issueToken() {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expires, r: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt: expires };
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'נדרשת התחברות מנהל' });
  }
  next();
}
