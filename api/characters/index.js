import { requireAuth } from '../lib/auth.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';
import { listCharacters, saveCharacter } from '../lib/storage.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method === 'GET') {
    return json(res, 200, { characters: await listCharacters() });
  }
  if (req.method === 'POST') {
    const body = await readJson(req);
    const id = await saveCharacter(body.character || body);
    return json(res, 200, { id });
  }
  return methodNotAllowed(res);
}
