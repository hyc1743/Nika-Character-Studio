import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'nika_session';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken(secret = process.env.APP_SESSION_SECRET, ttlMs = DEFAULT_TTL_MS) {
  if (!secret) throw new Error('Missing session secret');
  const payload = base64url(JSON.stringify({ sub: 'owner', exp: Date.now() + ttlMs }));
  return `${payload}.${sign(payload, secret)}`;
}

export function createSessionCookie(secret = process.env.APP_SESSION_SECRET, ttlMs = DEFAULT_TTL_MS, options = {}) {
  const token = createSessionToken(secret, ttlMs);
  const maxAge = Math.floor(ttlMs / 1000);
  const secure = options.secure ?? process.env.NODE_ENV !== 'development';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${secure ? 'Secure; ' : ''}Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function verifySessionCookie(token, secret = process.env.APP_SESSION_SECRET) {
  try {
    if (!token || !secret) return false;
    const [payload, signature] = String(token).split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.sub === 'owner' && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

export function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return cookies;
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return verifySessionCookie(cookies[COOKIE_NAME]);
}

export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return false;
}

export { COOKIE_NAME };
