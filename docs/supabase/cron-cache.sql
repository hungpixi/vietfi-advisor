create table if not exists public.cron_cache (
  job_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null,
  source text not null default 'cron',
  updated_at timestamptz not null default now()
);

create index if not exists cron_cache_fetched_at_idx
  on public.cron_cache (fetched_at desc);
