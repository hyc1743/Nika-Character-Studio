# Vercel Backend Setup

This project now keeps the existing static frontend and adds Vercel API routes for persistence, authentication, AI proxying, Blob artifacts, and queued background jobs.

## Required Vercel Resources

- Neon Postgres from the Vercel Marketplace.
- Vercel Blob store, preferably private.
- Vercel Queues permission enabled for the project.

## Environment Variables

Copy `.env.example` and set:

- `DATABASE_URL`: Neon/Postgres connection string.
- `BLOB_READ_WRITE_TOKEN`: created by Vercel Blob.
- `APP_PASSWORD_HASH`: generated with `npm run hash-password -- "your password"`.
- `APP_SESSION_SECRET`: generated with `npm run generate-secret`.
- `APP_ENCRYPTION_KEY`: generated with `npm run generate-secret`.
- `DISABLE_VERCEL_QUEUE`: set `true` only for local development without queues.

## Database

Run `db/schema.sql` against the Neon database before first deployment.

## Local Verification

```bash
npm install
npm test
npm run check-env
DISABLE_VERCEL_QUEUE=true npm run dev
```

Set `DISABLE_VERCEL_QUEUE=true` locally when Vercel Queues is not available. Production should leave it as `false`.

## Current V1 Behavior

- The app shows a site-password login gate before use.
- API keys are stored server-side encrypted in `api_configs`.
- Browser AI calls should be moved to `/api/ai/chat`; new backend client helpers are available on `window.NikaBackend`.
- A compatibility fetch proxy sends existing browser AI/SD requests through `/api/ai/proxy` when the URL looks like a chat-completions, Gemini, model-list, or SD WebUI endpoint.
- Generated outputs can be persisted through `/api/artifacts`; queued jobs can attach an `artifact` payload to write a Blob-backed result.
- The injected backend client shows a small bottom-right sync widget. `备份` stores a browser snapshot of localStorage and available IndexedDB databases in server KV; `恢复` writes the snapshot back into the current browser. This is a v1 bridge, not a per-record merge system.
- Existing browser IndexedDB data is not automatically migrated. Use the existing import/export flows for manual migration.
- Large files and generated artifacts should use Blob-backed upload/download flows; server uploads must stay below Vercel's 4.5 MB request limit.
