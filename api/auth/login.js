import { scryptSync, timingSafeEqual } from 'node:crypto';

import { createSessionCookie } from '../lib/auth.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [scheme, salt, hash] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'base64url');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const body = await readJson(req);
  if (!verifyPassword(String(body.password || ''), process.env.APP_PASSWORD_HASH)) {
    return json(res, 401, { error: 'Invalid password' });
  }
  res.setHeader('Set-Cookie', createSessionCookie(undefined, undefined, {
    secure: req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV !== 'development'
  }));
  return json(res, 200, { ok: true });
}
