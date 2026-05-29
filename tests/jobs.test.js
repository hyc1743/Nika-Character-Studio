import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createJobRecord, transitionJob } from '../api/lib/jobs.js';

test('createJobRecord initializes queued job progress', () => {
  const job = createJobRecord({ type: 'novel_worldbook', payload: { artifactId: 'a1' } });

  assert.equal(job.type, 'novel_worldbook');
  assert.equal(job.status, 'queued');
  assert.equal(job.progress, 0);
  assert.ok(job.id.startsWith('job_'));
});

test('transitionJob rejects invalid transitions', () => {
  const job = createJobRecord({ type: 'sd_generate', payload: {} });
  const running = transitionJob(job, 'running', { currentStep: 'generating' });
  const done = transitionJob(running, 'succeeded', { progress: 100 });

  assert.throws(() => transitionJob(done, 'running'), /Cannot transition/);
});
