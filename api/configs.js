import { randomUUID } from 'node:crypto';

import { requireAuth } from './lib/auth.js';
import { encryptSecret } from './lib/crypto.js';
import { query } from './lib/db.js';
import { json, methodNotAllowed, readJson } from './lib/http.js';
import { hydrateApiConfig, sanitizeApiConfig } from './lib/ai.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const rows = await query`select * from api_configs order by updated_at desc`;
    return json(res, 200, { configs: rows.map(row => sanitizeApiConfig(hydrateApiConfig(row))) });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const id = body.id || `cfg_${randomUUID()}`;
    const encryptedKey = body.apiKey ? encryptSecret(body.apiKey) : body.encryptedApiKey || null;
    await query`
      insert into api_configs (id, name, provider, base_url, model, encrypted_api_key, options, updated_at)
      values (${id}, ${body.name}, ${body.provider}, ${body.baseUrl}, ${body.model}, ${encryptedKey}, ${JSON.stringify(body.options || {})}::jsonb, now())
      on conflict (id) do update set
        name = excluded.name,
        provider = excluded.provider,
        base_url = excluded.base_url,
        model = excluded.model,
        encrypted_api_key = coalesce(excluded.encrypted_api_key, api_configs.encrypted_api_key),
        options = excluded.options,
        updated_at = now()
    `;
    return json(res, 200, { id });
  }

  if (req.method === 'DELETE') {
    const body = await readJson(req);
    await query`delete from api_configs where id = ${body.id}`;
    return json(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
