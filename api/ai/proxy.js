import { requireAuth } from '../lib/auth.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';
import { isAllowedProxyTarget } from '../lib/proxy-targets.js';

function sanitizeHeaders(headers = {}) {
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (['host', 'connection', 'content-length', 'cookie'].includes(lower)) continue;
    result[key] = value;
  }
  return result;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    if (!body.url || !isAllowedProxyTarget(body.url)) {
      return json(res, 400, { error: 'Proxy target is not allowed' });
    }

    const upstream = await fetch(body.url, {
      method: body.method || 'POST',
      headers: sanitizeHeaders(body.headers),
      body: body.body == null ? undefined : body.body
    });

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    if (upstream.body) {
      for await (const chunk of upstream.body) res.write(chunk);
      return res.end();
    }
    return res.end();
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
