-- =====================================================================
-- Trafy Assessment Platform — full schema
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Replaces the old db.sql. Key differences:
--   * questions carry correct answers and are NEVER readable by clients
--   * assessment_attempts pin a per-user question set + server-side clock
--   * RLS is enabled everywhere with explicit policies
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users, created automatically on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up (email OR Google).
-- Google puts the name in raw_user_meta_data->>'full_name' or 'name'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'candidate'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at   = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- questions — the bank. Contains correct answers, so clients get NO access.
-- id is a content hash of the prompt, so re-seeding is idempotent.
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id            text primary key,
  kind          text not null check (kind in ('mcq', 'dsa')),
  topic         text,
  prompt        text,
  options       jsonb,
  correct_index integer,
  title         text,
  description   text,
  template      text,
  function_name text,
  test_cases    jsonb,
  points        integer not null default 10,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists questions_kind_active_idx on public.questions (kind, active);

-- ---------------------------------------------------------------------
-- assessments — configuration for an assessment
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
  id               serial primary key,
  slug             text unique not null,
  title            text not null,
  description      text,
  duration_minutes integer not null default 90,
  mcq_count        integer not null default 45,
  dsa_count        integer not null default 2,
  max_attempts     integer not null default 3,
  mcq_points       integer not null default 10,
  dsa_points       integer not null default 50,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

insert into public.assessments (slug, title, description)
values ('cohort-26', 'Trafy Master Assessment — Cohort ''26',
        '45 multiple-choice questions and 2 DSA challenges.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- assessment_attempts — one row per attempt. The question set is pinned
-- here at start time so a refresh cannot reshuffle it, and expires_at is
-- the authoritative clock (the browser timer is display only).
-- ---------------------------------------------------------------------
create table if not exists public.assessment_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  assessment_id    integer not null references public.assessments(id),
  attempt_number   integer not null,
  status           text not null default 'in_progress'
                     check (status in ('in_progress', 'submitted', 'expired')),

  mcq_question_ids jsonb not null default '[]',
  dsa_question_ids jsonb not null default '[]',

  answers          jsonb not null default '{}',   -- { questionId: optionIndex }
  dsa_code         jsonb not null default '{}',   -- { questionId: sourceCode }

  started_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  submitted_at     timestamptz,
  last_saved_at    timestamptz not null default now(),

  mcq_score        integer not null default 0,
  dsa_score        integer not null default 0,
  total_score      integer not null default 0,
  max_score        integer not null default 0,
  correct_count    integer not null default 0,
  dsa_status       text not null default 'not_run'
                     check (dsa_status in ('not_run', 'scored', 'unavailable')),
  dsa_detail       jsonb,

  constraint attempts_unique_number unique (user_id, assessment_id, attempt_number)
);

create index if not exists attempts_user_idx        on public.assessment_attempts (user_id, assessment_id);
create index if not exists attempts_leaderboard_idx on public.assessment_attempts (status, total_score desc, submitted_at asc);

-- Only one live attempt per user per assessment.
create unique index if not exists attempts_one_active_idx
  on public.assessment_attempts (user_id, assessment_id)
  where status = 'in_progress';

-- ---------------------------------------------------------------------
-- Row Level Security
-- The backend uses the service_role key, which bypasses RLS. These
-- policies exist so that a leaked anon key cannot read anything sensitive.
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.questions            enable row level security;
alter table public.assessments          enable row level security;
alter table public.assessment_attempts  enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- questions: no policy at all => no client can read them. Correct answers
-- are only ever reachable through the service_role key on the server.

drop policy if exists "assessments: read active" on public.assessments;
create policy "assessments: read active" on public.assessments
  for select to authenticated using (active = true);

drop policy if exists "attempts: read own" on public.assessment_attempts;
create policy "attempts: read own" on public.assessment_attempts
  for select using (auth.uid() = user_id);
-- No client insert/update policy: attempts are only ever written by the
-- server, which owns scoring and the clock.

-- ---------------------------------------------------------------------
-- leaderboard — best submitted attempt per candidate.
-- Exposes display_name and score only; never email.
-- Served through the authenticated API, not read directly by clients.
-- ---------------------------------------------------------------------
create or replace view public.leaderboard as
select distinct on (a.user_id)
  a.user_id,
  p.display_name,
  a.total_score,
  a.max_score,
  a.correct_count,
  a.submitted_at
from public.assessment_attempts a
join public.profiles p on p.id = a.user_id
where a.status = 'submitted'
order by a.user_id, a.total_score desc, a.submitted_at asc;
