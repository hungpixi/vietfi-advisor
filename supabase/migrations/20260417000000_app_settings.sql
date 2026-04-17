-- Create generic app_settings table to store configuration and macro data
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;

-- Allow public read access (settings are generally safe to read by any user, including guests)
drop policy if exists app_settings_read_all on public.app_settings;
create policy app_settings_read_all
  on public.app_settings
  for select
  using (true);

-- Allow authenticated users with an 'admin' role to update? 
-- For now, updates will be done manually via Supabase Studio or a protected admin route.
-- So we won't add an UPDATE policy yet. Only SELECT is public.

-- Seed default macro data
insert into public.app_settings (key, value)
values (
  'macro_data',
  '{
    "gdpYoY": [
      { "period": "2025", "value": 8.02 },
      { "period": "2024", "value": 7.09 },
      { "period": "2023", "value": 5.05 },
      { "period": "Q4/2025", "value": 8.46 }
    ],
    "cpiYoY": [
      { "period": "2025", "value": 3.31 },
      { "period": "Feb 2026", "value": 3.35 }
    ],
    "deposit12m": {
      "min": 5.2,
      "max": 7.2,
      "source": "CafeF (ước tính)"
    }
  }'::jsonb
)
on conflict (key) do nothing;
