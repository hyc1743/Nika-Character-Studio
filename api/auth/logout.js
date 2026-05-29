import { clearSessionCookie } from '../lib/auth.js';
import { json, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  res.setHeader('Set-Cookie', clearSessionCookie());
  return json(res, 200, { ok: true });
}
