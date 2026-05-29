import { requireAuth } from '../lib/auth.js';
import { hydrateApiConfig } from '../lib/ai.js';
import { query } from '../lib/db.js';
import { json, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const configId = new URL(req.url, 'http://localhost').searchParams.get('configId');
    const rows = await query`select * from api_configs where id = ${configId}`;
    if (!rows[0]) return json(res, 404, { error: 'API config not found' });
    const config = hydrateApiConfig(rows[0]);

    if (config.provider === 'gemini') {
      const upstream = await fetch(`${config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models?key=${encodeURIComponent(config.apiKey)}`);
      const data = await upstream.json();
      return json(res, upstream.status, { models: (data.models || []).map(model => model.name?.replace('models/', '')).filter(Boolean), raw: data });
    }

    const base = String(config.baseUrl).replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
    const upstream = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${config.apiKey}` } });
    const data = await upstream.json();
    return json(res, upstream.status, { models: (data.data || []).map(model => model.id).filter(Boolean), raw: data });
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
}
