import { requireAuth } from '../lib/auth.js';
import { deleteCharacter, getCharacter } from '../lib/storage.js';
import { json, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const id = req.query.id;
  if (req.method === 'GET') {
    const character = await getCharacter(id);
    return character ? json(res, 200, { character }) : json(res, 404, { error: 'Not found' });
  }
  if (req.method === 'DELETE') {
    await deleteCharacter(id);
    return json(res, 200, { ok: true });
  }
  return methodNotAllowed(res);
}
