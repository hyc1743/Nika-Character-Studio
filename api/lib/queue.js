import { QueueClient } from '@vercel/queue';

const queue = new QueueClient({ region: process.env.VERCEL_REGION || 'iad1' });

export async function enqueueJob(job) {
  if (process.env.DISABLE_VERCEL_QUEUE === 'true') {
    return { disabled: true, messageId: null };
  }
  return queue.send('nika-jobs', { jobId: job.id, type: job.type }, {
    idempotencyKey: job.id,
    retentionSeconds: 60 * 60 * 24
  });
}

export const handleQueueCallback = queue.handleCallback.bind(queue);
