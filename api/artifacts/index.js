import { requireAuth } from '../lib/auth.js';
import { createArtifact, listArtifacts } from '../lib/artifacts.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const limit = Number(new URL(req.url, 'http://localhost').searchParams.get('limit') || 100);
    return json(res, 200, { artifacts: await listArtifacts(Math.min(Math.max(limit, 1), 500)) });
  }

  if (req.method === 'POST') {
    try {
      const body = await readJson(req);
      const artifact = await createArtifact(body);
      return json(res, 201, { artifact });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  return methodNotAllowed(res);
}
