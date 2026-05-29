import { requireAuth } from '../lib/auth.js';
import { buildAiRequest, extractTextFromAiResponse, hydrateApiConfig } from '../lib/ai.js';
import { query } from '../lib/db.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';

async function loadConfig(id) {
  const rows = await query`select * from api_configs where id = ${id}`;
  if (!rows[0]) throw new Error('API config not found');
  return hydrateApiConfig(rows[0]);
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    const config = await loadConfig(body.configId);
    const request = buildAiRequest({
      config,
      messages: body.messages,
      stream: Boolean(body.stream),
      parameters: body.parameters || {}
    });

    const upstream = await fetch(request.url, request.init);
    if (!upstream.ok) {
      const errorText = await upstream.text();
      return json(res, upstream.status, { error: errorText });
    }

    if (request.stream && upstream.body) {
      res.statusCode = 200;
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8');
      for await (const chunk of upstream.body) res.write(chunk);
      return res.end();
    }

    const data = await upstream.json();
    return json(res, 200, {
      provider: request.provider,
      text: extractTextFromAiResponse(request.provider, data),
      raw: data
    });
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
}
