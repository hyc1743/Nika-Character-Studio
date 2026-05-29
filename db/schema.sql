create table if not exists kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists characters (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_configs (
  id text primary key,
  name text not null,
  provider text not null,
  base_url text not null,
  model text not null,
  encrypted_api_key text,
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id text primary key,
  type text not null,
  status text not null,
  progress integer not null default 0,
  current_step text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists job_events (
  id text primary key,
  job_id text not null references jobs(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists artifacts (
  id text primary key,
  kind text not null,
  pathname text not null,
  url text not null,
  content_type text,
  size bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs(status);
create index if not exists job_events_job_id_idx on job_events(job_id);
