import { requireAuth } from '../lib/auth.js';
import { getArtifact } from '../lib/artifacts.js';
import { json, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);

  const artifact = await getArtifact(req.query.id);
  return artifact ? json(res, 200, { artifact }) : json(res, 404, { error: 'Not found' });
}
