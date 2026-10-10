-- User library: saved birth people + generated reports (persist across sessions)
create table if not exists public.saved_birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  date text not null,
  time text not null default '12:00',
  place text not null default '',
  latitude double precision not null default 0,
  longitude double precision not null default 0,
  timezone text not null default 'UTC',
  time_unknown boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_birth_profiles_user_id_idx
  on public.saved_birth_profiles (user_id);
create index if not exists saved_birth_profiles_user_updated_idx
  on public.saved_birth_profiles (user_id, updated_at desc);

-- One row per user+name+date+time (upsert target)
create unique index if not exists saved_birth_profiles_user_identity_uidx
  on public.saved_birth_profiles (user_id, name, date, time);

create table if not exists public.user_generated_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id text not null,
  report_title text not null,
  chart_name text not null,
  partner_name text,
  markdown text not null,
  chart_snapshot jsonb not null default '{}'::jsonb,
  partner_snapshot jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists user_generated_reports_user_id_idx
  on public.user_generated_reports (user_id);
create index if not exists user_generated_reports_user_created_idx
  on public.user_generated_reports (user_id, created_at desc);

alter table public.saved_birth_profiles enable row level security;
alter table public.user_generated_reports enable row level security;

-- Profiles: owner-only CRUD
drop policy if exists "saved_birth_profiles_select_own" on public.saved_birth_profiles;
create policy "saved_birth_profiles_select_own"
  on public.saved_birth_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "saved_birth_profiles_insert_own" on public.saved_birth_profiles;
create policy "saved_birth_profiles_insert_own"
  on public.saved_birth_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_birth_profiles_update_own" on public.saved_birth_profiles;
create policy "saved_birth_profiles_update_own"
  on public.saved_birth_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_birth_profiles_delete_own" on public.saved_birth_profiles;
create policy "saved_birth_profiles_delete_own"
  on public.saved_birth_profiles for delete
  using (auth.uid() = user_id);

-- Generated reports: owner-only CRUD
drop policy if exists "user_generated_reports_select_own" on public.user_generated_reports;
create policy "user_generated_reports_select_own"
  on public.user_generated_reports for select
  using (auth.uid() = user_id);

drop policy if exists "user_generated_reports_insert_own" on public.user_generated_reports;
create policy "user_generated_reports_insert_own"
  on public.user_generated_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_generated_reports_delete_own" on public.user_generated_reports;
create policy "user_generated_reports_delete_own"
  on public.user_generated_reports for delete
  using (auth.uid() = user_id);
