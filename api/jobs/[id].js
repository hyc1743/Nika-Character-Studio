import { requireAuth } from '../lib/auth.js';
import { query } from '../lib/db.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const id = req.query.id;

  if (req.method === 'GET') {
    const jobs = await query`select * from jobs where id = ${id}`;
    const events = await query`select * from job_events where job_id = ${id} order by created_at asc`;
    return jobs[0] ? json(res, 200, { job: jobs[0], events }) : json(res, 404, { error: 'Not found' });
  }

  if (req.method === 'PATCH') {
    const body = await readJson(req);
    if (!['paused', 'queued', 'canceled'].includes(body.status)) {
      return json(res, 400, { error: 'Unsupported status update' });
    }
    const rows = await query`
      update jobs set status = ${body.status}, current_step = ${body.currentStep || body.status}, updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ? json(res, 200, { job: rows[0] }) : json(res, 404, { error: 'Not found' });
  }

  return methodNotAllowed(res);
}
