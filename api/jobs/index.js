import { query } from '../lib/db.js';
import { json, methodNotAllowed, readJson } from '../lib/http.js';
import { createJobRecord, jobEvent } from '../lib/jobs.js';
import { requireAuth } from '../lib/auth.js';
import { enqueueJob } from '../lib/queue.js';

async function insertJob(job) {
  await query`
    insert into jobs (id, type, status, progress, current_step, payload, result, error)
    values (${job.id}, ${job.type}, ${job.status}, ${job.progress}, ${job.currentStep}, ${JSON.stringify(job.payload)}::jsonb, ${JSON.stringify(job.result)}::jsonb, ${job.error})
  `;
  const event = jobEvent(job.id, 'created', { type: job.type });
  await query`
    insert into job_events (id, job_id, type, data)
    values (${event.id}, ${event.jobId}, ${event.type}, ${JSON.stringify(event.data)}::jsonb)
  `;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const jobs = await query`select * from jobs order by created_at desc limit 100`;
    return json(res, 200, { jobs });
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const job = createJobRecord({ type: body.type, payload: body.payload || {} });
    await insertJob(job);
    await enqueueJob(job);
    return json(res, 202, { job });
  }

  return methodNotAllowed(res);
}
