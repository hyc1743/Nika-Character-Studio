import { randomUUID } from 'node:crypto';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);
const VALID_TRANSITIONS = {
  queued: new Set(['running', 'paused', 'canceled', 'failed']),
  running: new Set(['queued', 'paused', 'succeeded', 'failed', 'canceled']),
  paused: new Set(['queued', 'running', 'canceled']),
  succeeded: new Set([]),
  failed: new Set([]),
  canceled: new Set([])
};

export function createJobRecord({ type, payload = {}, createdAt = new Date() }) {
  if (!type) throw new Error('Job type is required');
  return {
    id: `job_${randomUUID()}`,
    type,
    status: 'queued',
    progress: 0,
    currentStep: 'queued',
    payload,
    result: null,
    error: null,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString()
  };
}

export function transitionJob(job, nextStatus, patch = {}) {
  if (!VALID_TRANSITIONS[job.status]?.has(nextStatus)) {
    throw new Error(`Cannot transition job from ${job.status} to ${nextStatus}`);
  }
  const now = new Date().toISOString();
  return {
    ...job,
    ...patch,
    status: nextStatus,
    progress: patch.progress ?? (nextStatus === 'succeeded' ? 100 : job.progress),
    updatedAt: now,
    completedAt: TERMINAL.has(nextStatus) ? now : job.completedAt
  };
}

export function jobEvent(jobId, type, data = {}) {
  return {
    id: `evt_${randomUUID()}`,
    jobId,
    type,
    data,
    createdAt: new Date().toISOString()
  };
}
