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

    -- base table privileges — required IN ADDITION to RLS. Without these the
    -- authenticated role gets a 403 (42501) before any policy is evaluated.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    -- row level security: own rows only
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (auth.uid() = "supabaseUserId") with check (auth.uid() = "supabaseUserId")',
      t
    );
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- GymBro — Phase 3 social schema (friends, activity feed, reactions, leaderboards)
--
-- Design notes:
--  • The personal sync tables above are UNTOUCHED. Social lives in its own tables,
--    so a policy mistake here can never expose private workout/set rows — those
--    stay locked to `auth.uid() = supabaseUserId`.
--  • A finished workout is published as a *denormalized summary* (workout_shares),
--    never the raw sets. Each summary carries its own privacy:
--      public  → any signed-in user may read
--      friends → only an established (symmetric) friendship may read
--      private → owner only
--  • Friendships are symmetric, stored once as an ordered pair (user_a < user_b).
--  • are_friends() / can_view_share() are SECURITY DEFINER so they read the friend
--    graph without recursively triggering RLS (the standard Supabase pattern).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  "displayName" text,
  "shareCode" text unique,
  "avatarColor" text,
  "workoutPrivacy" text not null default 'friends',
  tier text not null default 'lifetime',
  "createdAt" double precision,
  "updatedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  "requestedBy" uuid not null references auth.users(id) on delete cascade,
  "createdAt" double precision,
  server_updated_at timestamptz not null default now(),
  constraint friendship_pair_order check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.workout_shares (
  uuid text primary key,              -- == local workout uuid (idempotent upsert)
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text,
  "startedAt" double precision,
  "durationMs" double precision,
  volume double precision,
  "setCount" integer,
  "exerciseCount" integer,
  "prCount" integer,
  "muscleGroups" jsonb,               -- string[]
  "topExercises" jsonb,               -- [{ name, sets, volume }]
  prs jsonb,                          -- [{ exerciseName, weight, reps, kind }]
  privacy text not null default 'friends',
  "deletedAt" double precision,       -- soft-delete so un-sharing propagates
  "updatedAt" double precision,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  "shareUuid" text not null references public.workout_shares(uuid) on delete cascade,
  "userId" uuid not null references auth.users(id) on delete cascade,
  emoji text not null default U&'\01F4AA',
  "createdAt" double precision,
  server_updated_at timestamptz not null default now(),
  unique ("shareUuid", "userId")
);

-- ── Helper functions (SECURITY DEFINER — read the friend graph without recursion) ──

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b)
  );
$$;

create or replace function public.can_view_share(p_share text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workout_shares s
    where s.uuid = p_share
      and (
        s."userId" = auth.uid()
        or (s."deletedAt" is null and (
          s.privacy = 'public'
          or (s.privacy = 'friends' and public.are_friends(auth.uid(), s."userId"))
        ))
      )
  );
$$;

-- Befriend the owner of a share code. Symmetric, idempotent, no self-add.
create or replace function public.add_friend_by_code(code text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); friend public.profiles;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into friend from public.profiles p where p."shareCode" = code;
  if friend.id is null then raise exception 'No friend found for that code.'; end if;
  if friend.id = me then raise exception 'That is your own code.'; end if;
  insert into public.friendships (user_a, user_b, "requestedBy", "createdAt")
    values (least(me, friend.id), greatest(me, friend.id), me, extract(epoch from now()) * 1000)
    on conflict (user_a, user_b) do nothing;
  return json_build_object('id', friend.id, 'username', friend.username,
    'displayName', friend."displayName", 'avatarColor', friend."avatarColor");
end $$;

-- Befriend a profile by id (used by username-search results). Symmetric, idempotent.
create or replace function public.add_friend(target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if target = me then raise exception 'cannot add yourself'; end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'profile not found'; end if;
  insert into public.friendships (user_a, user_b, "requestedBy", "createdAt")
    values (least(me, target), greatest(me, target), me, extract(epoch from now()) * 1000)
    on conflict (user_a, user_b) do nothing;
end $$;

-- ── Triggers, grants, RLS enablement ──────────────────────────────────────────

do $$
declare t text; tbls text[] := array['profiles','friendships','workout_shares','reactions'];
begin
  foreach t in array tbls loop
    execute format('drop trigger if exists trg_suat on public.%I', t);
    execute format('create trigger trg_suat before insert or update on public.%I for each row execute function public.set_server_updated_at()', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create index if not exists workout_shares_user_idx on public.workout_shares ("userId");
create index if not exists workout_shares_started_idx on public.workout_shares ("startedAt");
create index if not exists reactions_share_idx on public.reactions ("shareUuid");
create index if not exists friendships_a_idx on public.friendships (user_a);
create index if not exists friendships_b_idx on public.friendships (user_b);

grant execute on function public.add_friend_by_code(text) to authenticated;
grant execute on function public.add_friend(uuid) to authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.can_view_share(text) to authenticated;

-- profiles: readable by all signed-in users (discoverable by username); writable only by owner.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_modify on public.profiles;
create policy profiles_modify on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- friendships: a member may read or delete; only a member acting as requester may insert.
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert to authenticated
  with check (auth.uid() = "requestedBy" and (auth.uid() = user_a or auth.uid() = user_b));
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- workout_shares: owner has full access; others read by privacy + friendship.
drop policy if exists shares_select on public.workout_shares;
create policy shares_select on public.workout_shares for select to authenticated
  using (
    "userId" = auth.uid()
    or ("deletedAt" is null and (
      privacy = 'public'
      or (privacy = 'friends' and public.are_friends(auth.uid(), "userId"))
    ))
  );
drop policy if exists shares_modify on public.workout_shares;
create policy shares_modify on public.workout_shares for all to authenticated
  using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- reactions: read if you can view the parent share; write only your own.
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated
  using (public.can_view_share("shareUuid"));
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check ("userId" = auth.uid() and public.can_view_share("shareUuid"));
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated
  using ("userId" = auth.uid());
