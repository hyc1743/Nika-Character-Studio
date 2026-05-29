import { createArtifact } from '../lib/artifacts.js';
import { query } from '../lib/db.js';
import { jobEvent } from '../lib/jobs.js';
import { handleQueueCallback } from '../lib/queue.js';

async function recordEvent(jobId, type, data = {}) {
  const event = jobEvent(jobId, type, data);
  await query`
    insert into job_events (id, job_id, type, data)
    values (${event.id}, ${event.jobId}, ${event.type}, ${JSON.stringify(event.data)}::jsonb)
  `;
}

async function processJob(message) {
  const { jobId, type } = message;
  const jobs = await query`select * from jobs where id = ${jobId}`;
  const job = jobs[0];
  if (!job || ['succeeded', 'failed', 'canceled', 'paused'].includes(job.status)) return;

  await query`
    update jobs set status = 'running', current_step = 'processing', progress = greatest(progress, 10), updated_at = now()
    where id = ${jobId}
  `;
  await recordEvent(jobId, 'started', { type });

  let result = { message: 'Job processor scaffold completed', type };
  if (job.payload?.artifact) {
    const artifact = await createArtifact(job.payload.artifact);
    result = { ...result, artifactId: artifact.id };
    await recordEvent(jobId, 'artifact_created', { artifactId: artifact.id });
  }

  await query`
    update jobs
    set status = 'succeeded',
        current_step = 'completed',
        progress = 100,
        result = ${JSON.stringify(result)}::jsonb,
        updated_at = now(),
        completed_at = now()
    where id = ${jobId}
  `;
  await recordEvent(jobId, 'succeeded', { type });
}

export default handleQueueCallback(async (message) => {
  await processJob(message);
}, {
  visibilityTimeoutSeconds: 300,
  retry: (_error, metadata) => {
    if (metadata.deliveryCount > 5) return { acknowledge: true };
    return { afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5) };
  }
});
