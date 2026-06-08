-- ════════════════════════════════════════════════════════════════════════════
-- GymBro — Phase 6 cloud sync schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
--
-- Design notes:
--  • Column names are quoted camelCase to match the app's TypeScript fields 1:1,
--    so the client needs zero field mapping.
--  • Epoch-millisecond fields use `double precision` (exact for values < 2^53 and
--    always returned to JS as a number — avoids bigint-as-string surprises).
--  • `server_updated_at` is stamped by a trigger on every write and is the cursor
--    the client pulls against — robust against device clock skew.
--  • Row Level Security: each user can only read/write rows where
--    supabaseUserId = auth.uid().
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists public.exercises (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  name text,
  "primaryMuscle" text,
  "secondaryMuscles" jsonb,
  equipment text,
  category text,
  "isCustom" boolean,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  name text,
  "exerciseOrder" jsonb,
  notes text,
  "createdAt" double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  name text,
  type text,
  "routineUuid" text,
  "startedAt" double precision,
  "endedAt" double precision,
  status text,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.sets (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  "workoutUuid" text,
  "exerciseUuid" text,
  "setNumber" double precision,
  weight double precision,
  reps double precision,
  rpe double precision,
  "restSeconds" double precision,
  "completedAt" double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.foods (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  name text,
  brand text,
  "caloriesPer100g" double precision,
  protein double precision,
  carbs double precision,
  fat double precision,
  "isCustom" boolean,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public."foodEntries" (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  date text,
  "foodUuid" text,
  "mealType" text,
  grams double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public."dailyGoals" (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  date text,
  "calorieGoal" double precision,
  "proteinGoal" double precision,
  "carbGoal" double precision,
  "fatGoal" double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.measurements (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  type text,
  label text,
  unit text,
  "isCustom" boolean,
  "sortOrder" double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public."measurementEntries" (
  uuid text primary key,
  "supabaseUserId" uuid not null references auth.users(id) on delete cascade,
  "measurementUuid" text,
  value double precision,
  date text,
  "createdAt" double precision,
  "updatedAt" double precision,
  "deletedAt" double precision,
  server_updated_at timestamptz not null default now()
);

-- ── Trigger: stamp server_updated_at on every insert/update ───────────────────

create or replace function public.set_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at := now();
  return new;
end $$;

-- ── Indexes, triggers, RLS — applied uniformly to every synced table ──────────

do $$
declare
  t text;
  tbls text[] := array[
    'exercises','routines','workouts','sets','foods',
    'foodEntries','dailyGoals','measurements','measurementEntries'
  ];
begin
  foreach t in array tbls loop
    -- server cursor + per-user lookup indexes
    execute format('create index if not exists %I on public.%I (server_updated_at)', t || '_suat_idx', t);
    execute format('create index if not exists %I on public.%I ("supabaseUserId")', t || '_user_idx', t);

    -- stamp trigger
    execute format('drop trigger if exists trg_suat on public.%I', t);
    execute format('create trigger trg_suat before insert or update on public.%I for each row execute function public.set_server_updated_at()', t);

    -- row level security: own rows only
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (auth.uid() = "supabaseUserId") with check (auth.uid() = "supabaseUserId")',
      t
    );
  end loop;
end $$;
