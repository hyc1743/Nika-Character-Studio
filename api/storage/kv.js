import { requireAuth } from '../lib/auth.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';
import { getKv, removeKv, setKv } from '../lib/storage.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method === 'GET') {
    const key = new URL(req.url, 'http://localhost').searchParams.get('key');
    return json(res, 200, { value: await getKv(key) });
  }
  if (req.method === 'PUT') {
    const body = await readJson(req);
    await setKv(body.key, body.value);
    return json(res, 200, { ok: true });
  }
  if (req.method === 'DELETE') {
    const body = await readJson(req);
    await removeKv(body.key);
    return json(res, 200, { ok: true });
  }
  return methodNotAllowed(res);
}
