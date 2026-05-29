import { isAuthenticated } from '../lib/auth.js';
import { json, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  return json(res, 200, { authenticated: isAuthenticated(req) });
}
