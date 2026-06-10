# GymBro — Complete Technical Documentation

> A dark-themed, offline-first fitness PWA: workout tracker + food diary + body measurements + social, with optional Supabase auth & cloud sync. Built mobile-first (~390px), fully usable offline, deployed on Vercel.
>
> This document is an exhaustive map of the codebase: every file, every data structure, every feature. Last generated covering the post-Phase-5 state (Phases 0–5 of the v3 roadmap complete).

---

## Table of contents

1. [High-level overview](#1-high-level-overview)
2. [Tech stack](#2-tech-stack)
3. [Project structure (file tree)](#3-project-structure-file-tree)
4. [Design system](#4-design-system)
5. [Data layer — Dexie / IndexedDB](#5-data-layer--dexie--indexeddb)
6. [TypeScript domain types](#6-typescript-domain-types)
7. [Seed & static data](#7-seed--static-data)
8. [State management (Zustand stores)](#8-state-management-zustand-stores)
9. [Offline-first cloud sync engine](#9-offline-first-cloud-sync-engine)
10. [Social layer](#10-social-layer)
11. [Supabase backend (SQL schema, RLS, RPCs)](#11-supabase-backend-sql-schema-rls-rpcs)
12. [Auth](#12-auth)
13. [App shell & routing](#13-app-shell--routing)
14. [Pages](#14-pages)
15. [Components](#15-components)
16. [Library / utility modules](#16-library--utility-modules)
17. [Feature catalogue by roadmap phase](#17-feature-catalogue-by-roadmap-phase)
18. [Tier system (publish-ready architecture)](#18-tier-system-publish-ready-architecture)
19. [Build, PWA & deployment](#19-build-pwa--deployment)
20. [Known limitations](#20-known-limitations)

---

## 1. High-level overview

GymBro is a single-page React PWA. The architecture has three concentric layers:

- **Local-first core** — everything is written to **IndexedDB (Dexie)** first. The app is fully functional with no network and no account. This is the source of truth.
- **Personal cloud sync (optional)** — when a user signs in with Supabase, a background engine replicates their private Dexie tables to Supabase using last-write-wins (LWW) merge. It is additive and never blocks the UI.
- **Social (optional, online-only)** — friends, activity feed, reactions, and leaderboards live in *separate* Supabase tables queried directly. Deliberately isolated from the personal sync engine so a social bug can never leak private workout data.

Three product domains:
1. **Workouts** — live session logging, routines, program templates, exercise library, supersets/warm-up/drop/failure set types, plate & warm-up calculators, rest timer, PR detection, progress charts.
2. **Food** — daily diary with macro goals, online food search (Open Food Facts), barcode scanning, saved meals, recipe builder, water tracking.
3. **Body & progress** — measurements with trend charts, achievements/badges, progress photos (local only), weekly/monthly reports, data export (JSON/CSV/PDF).

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 8 + TypeScript (strict, no `any`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + hand-written CSS design tokens in `src/index.css` |
| Local DB | Dexie.js 4 (IndexedDB wrapper) + `dexie-react-hooks` (`useLiveQuery`) |
| State | Zustand 5 (session, auth, sync stores) |
| Routing | React Router 7 (`BrowserRouter`) |
| Backend | Supabase (`@supabase/supabase-js` 2) — auth, Postgres, RLS. **Optional** |
| Charts | Recharts 3 (lazy-loaded) |
| Animation | Framer Motion 12 (sheets, rest timer, summary celebration) |
| Icons | lucide-react |
| Barcode | `@zxing/browser` (dynamically imported) |
| Food API | Open Food Facts REST (free, no key) |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) |
| Hosting | Vercel (auto-deploy on push to `main`) |

**Scripts** (`package.json`): `dev` (vite), `build` (`tsc -b && vite build`), `lint` (eslint), `preview`.

---

## 3. Project structure (file tree)

```
GymBro/
├── index.html                  # PWA meta, iOS tags, #root mount
├── vite.config.ts              # Vite + React + Tailwind + PWA manifest/workbox
├── package.json                # deps & scripts
├── tsconfig*.json              # TS project refs (app/node)
├── eslint.config.js
├── CLAUDE.md                   # v3 roadmap & build rules (project instructions)
├── README.md                   # user-facing readme
├── CHANGELOG.md
├── DOCUMENTATION.md            # ← this file
├── supabase/
│   └── schema.sql              # ALL backend: personal sync tables + social tables, triggers, RLS, RPCs
├── public/                     # icons.svg, favicon.svg, (PWA icons referenced)
└── src/
    ├── main.tsx                # entry: seed exercises, mount <App/> in <BrowserRouter>
    ├── App.tsx                 # shell: routes, tab bar, theme & accent application, onboarding trigger
    ├── index.css               # design tokens + every component class
    ├── data/
    │   ├── exercises.seed.ts   # 148 built-in exercises (deterministic UUIDs)
    │   └── programTemplates.ts # 4 ready-to-clone programs
    ├── db/
    │   └── index.ts            # Dexie schema (v1–v5), singleton helpers, consolidation
    ├── types/
    │   └── index.ts            # every domain interface/type
    ├── store/
    │   ├── sessionStore.ts     # live workout session (Zustand)
    │   ├── authStore.ts        # Supabase auth (Zustand)
    │   └── syncStore.ts        # sync status pill state (Zustand)
    ├── lib/
    │   ├── settings.ts         # AppSettings, accent palettes, useSettings()
    │   ├── prs.ts              # 1RM, PR detection, progress series, workout summary
    │   ├── achievements.ts     # badge definitions + stat computation
    │   ├── reports.ts          # weekly/monthly period stats
    │   ├── foodCalc.ts         # macro math, date helpers
    │   ├── format.ts           # duration/date/volume formatting
    │   ├── history.ts          # last-performance lookup
    │   ├── exerciseMeta.ts     # muscle/equipment filters & colors
    │   ├── exerciseInstructions.ts # "how to perform" text per seed exercise
    │   ├── measurementTypes.ts # predefined body-measurement defs
    │   ├── openFoodFacts.ts    # food search + barcode lookup
    │   ├── exportCsv.ts        # workouts/routines → CSV
    │   ├── exportPdf.ts        # workouts/routines → printable PDF
    │   ├── feedback.ts         # Web Audio beeps/fanfare + vibration
    │   ├── chartTheme.ts       # shared recharts colors/tooltip
    │   ├── tier.ts             # FEATURES config, useTier(), canAccess()
    │   ├── useNow.ts           # interval clock hook (foreground-aware)
    │   ├── supabase.ts         # optional Supabase client
    │   └── sync/
    │       ├── engine.ts       # push/pull sync loop, change capture
    │       └── tables.ts       # synced-table config + row mapping
    ├── pages/                  # 17 route components (see §14)
    └── components/             # 18 reusable components (see §15)
```

---

## 4. Design system

Defined in `src/index.css`. **Dark-first** with light overrides.

### Design tokens (CSS custom properties on `:root`)
- **Accent:** `--color-accent` (default `34 197 94` = green #22c55e), `--color-accent-dim` (`22 163 74`), `--color-accent-amber` (`245 158 11`, used for PRs/timers).
- **Surfaces:** `--color-bg` (`10 10 15`), `--color-surface` (`21 21 30`), `--color-surface-2` (`30 30 46`), `--color-border` (`42 42 64`).
- **Text:** `--color-text` (`241 241 241`), `--color-text-muted` (`139 139 160`).
- **Radii:** `--radius-sm` 8px → `--radius-xl` 20px.
- **Safe areas:** `--safe-top/bottom/left/right` from `env(safe-area-inset-*)`.
- `--tab-bar-height: 60px`.

Colors are stored as raw `R G B` triplets so they compose with Tailwind's `rgb(var(--x) / alpha)` syntax.

### Theming
- **Light/dark mode:** three sources, in precedence order — `@media (prefers-color-scheme: light)`, then `html[data-theme="light"|"dark"]` attribute (set by `App.tsx` from the `theme` setting). System theme removes the attribute.
- **Accent color** (Phase 5): `App.tsx` writes `--color-accent` / `--color-accent-dim` inline on `<html>` from the chosen `accentColor` setting (green/blue/purple/orange/red — see `ACCENT_PALETTES`).

### Key CSS classes
Layout: `.page-content` (scroll container, safe-area padding, bottom padding for tab bar), `.tab-bar` + `.tab-item` + `.tab-icon-wrap` (fixed bottom nav, glassy blur), `.page-header`, `.section-title`.

Surfaces/controls: `.card`, `.btn` (+ `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `:disabled`), `.input`, `.icon-btn`, `.empty-state`, `.nav-card`.

Bottom sheets: `.sheet-overlay` (dim backdrop, `touch-action: none`), `.sheet` (90dvh max, `overscroll-behavior: contain`), `.sheet-handle`. **Scroll-lock:** `html.sheet-open body, html.sheet-open .page-content { overflow: hidden }` (prevents background scroll-through while a sheet is open).

Session UI: `.session-name`, `.timer-pause`, `.rest-step`, `.set-head`, `.set-row` (+ `.set-row-done`), `.set-num`, `.set-input`, `.set-check` (+ `-done`), `.set-remove`, `.pr-flag`, `.add-set`, `.pick-row`, `.pick-check`, `.reorder-btn`.

Rest timer: `.rest-timer-card`, `.rest-timer-inner`, `.rest-ctrl-btn`.

Animation: `.spin` (`spin 1s linear infinite`).

---

## 5. Data layer — Dexie / IndexedDB

File: `src/db/index.ts`. Database name `FitTrackerDB`. Class `FitTrackerDB extends Dexie`. Exported singleton `db`.

### Tables (current schema, v5)

| Table | Primary key & indexes |
|---|---|
| `exercises` | `&uuid, name, primaryMuscle, equipment, category, isCustom, updatedAt, deletedAt` |
| `routines` | `&uuid, name, createdAt, updatedAt, deletedAt` |
| `workouts` | `&uuid, routineUuid, startedAt, endedAt, status, updatedAt, deletedAt` |
| `sets` | `&uuid, workoutUuid, exerciseUuid, completedAt, updatedAt, deletedAt` |
| `foods` | `&uuid, name, isCustom, updatedAt, deletedAt` |
| `foodEntries` | `&uuid, date, foodUuid, mealType, updatedAt, deletedAt` |
| `dailyGoals` | `&uuid, date, updatedAt, deletedAt` |
| `settings` | `&key` |
| `measurements` | `&uuid, type, sortOrder, updatedAt, deletedAt` |
| `measurementEntries` | `&uuid, measurementUuid, date, updatedAt, deletedAt` |
| `syncState` | `&id` |
| `savedMeals` | `&uuid, updatedAt, deletedAt` |
| `recipes` | `&uuid, updatedAt, deletedAt` |
| `waterEntries` | `&uuid, date, updatedAt, deletedAt` |
| `progressPhotos` | `&uuid, date, createdAt, updatedAt, deletedAt` |

### Migration history (Dexie versions)
- **v1** — core: exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, settings.
- **v2** — adds `measurements`, `measurementEntries`.
- **v3** — adds `syncState` (Phase 6 cloud sync cursors).
- **v4** — adds `savedMeals`, `recipes`, `waterEntries` (Phase 2 food features).
- **v5** — adds `progressPhotos` (Phase 4, local-only photos).

### Seed & helpers
- **`populate` hook** seeds `EXERCISE_SEED` on first DB creation.
- **`ensureExercisesSeed()`** — re-seeds built-in exercises if the table is empty (e.g. after a manual clear). Called from `main.tsx` on boot.
- **Soft deletes everywhere** — records carry `deletedAt: number | null`; queries filter `deletedAt === null`. This makes deletions replicate cleanly through LWW sync.

### Singleton convergence (avoids cross-device duplicates under LWW)
Some records are logically singletons; deterministic UUIDs make two devices converge to one row:
- **`measurementUuidForType(type)`** → `measurement-<type>` for predefined (non-custom) measurements.
- **`dailyGoalUuid(date)`** → `goal-<date>`.
- **`consolidateMeasurements()`** — ensures the two primaries (Body Weight, Height) exist; collapses duplicate non-custom measurements of the same `type` onto the canonical UUID, repointing their entries and soft-deleting losers. Idempotent + re-entrancy-guarded; run reactively in `ProfilePage`.
- **`consolidateDailyGoals()`** — collapses duplicate goals per `date` to `goal-<date>`, keeping most-recently-edited values. Run on `FoodPage` mount.
- Custom measurements/foods/exercises and all event records (workouts, sets, food entries) keep **random** UUIDs — duplicates there are intentional/distinct.

---

## 6. TypeScript domain types

File: `src/types/index.ts`.

**Enums/unions:**
- `Equipment` = `barbell | dumbbell | machine | cable | bodyweight | kettlebell | band | smith`
- `MuscleGroup` = `chest | back | shoulders | biceps | triceps | forearms | quads | hamstrings | glutes | calves | core | cardio`
- `Category` = `strength | cardio`
- `MealType` = `breakfast | lunch | dinner | snack`
- `SetType` = `normal | warmup | dropset | failure`

**Interfaces (all fields):**
- **`Exercise`** — `uuid, name, primaryMuscle, secondaryMuscles[], equipment, category, isCustom, updatedAt, deletedAt`
- **`Routine`** — `uuid, name, exerciseOrder[] (exercise uuids), notes?, createdAt, updatedAt, deletedAt`
- **`Workout`** — `uuid, name, type ('single'|'routine'), routineUuid?, startedAt, endedAt?, status ('active'|'finished'), updatedAt, deletedAt`
- **`WorkoutSet`** — `uuid, workoutUuid, exerciseUuid, setNumber, weight, reps, rpe?, restSeconds?, completedAt?, setType?, supersetGroup?, updatedAt, deletedAt`
- **`Food`** — `uuid, name, brand?, caloriesPer100g, protein, carbs, fat, isCustom, updatedAt, deletedAt`
- **`FoodEntry`** — `uuid, date (YYYY-MM-DD), foodUuid, mealType, grams, updatedAt, deletedAt`
- **`DailyGoal`** — `uuid, date, calorieGoal, proteinGoal, carbGoal, fatGoal, updatedAt, deletedAt`
- **`Setting`** — `key, value (string|number|boolean|number[])`
- **`SavedMeal`** — `uuid, name, items: {foodUuid, grams}[], updatedAt, deletedAt`
- **`Recipe`** — `uuid, name, servings, ingredients: {foodUuid, grams}[], updatedAt, deletedAt`
- **`WaterEntry`** — `uuid, date, ml, updatedAt, deletedAt`
- **`ProgressPhoto`** — `uuid, date, note?, dataUrl (base64 JPEG ≤1000px), createdAt, updatedAt, deletedAt`
- **`SyncState`** — `id (Supabase user id), lastPushedAt (local clock), lastPulledServerAt (server clock ISO | null)`
- **`Measurement`** — `uuid, type, label, unit, isCustom, sortOrder, updatedAt, deletedAt`
- **`MeasurementEntry`** — `uuid, measurementUuid, value, date (YYYY-MM-DD), createdAt, updatedAt, deletedAt`

---

## 7. Seed & static data

### `data/exercises.seed.ts` — 148 built-in exercises
Deterministic UUID pattern `00000000-0000-4000-a000-{12-digit index}` via `id(n)`. Sections (with counts noted in comments): Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core, Cardio, Kettlebell, Band. Each entry: `{ uuid, name, primaryMuscle, secondaryMuscles[], equipment, category, isCustom: false, updatedAt, deletedAt: null }`. Deterministic IDs let program templates and instructions reference exercises by number.

### `data/programTemplates.ts` — 4 clonable programs
`sid(n)` mirrors the seed-UUID pattern. Type `ProgramTemplate { id, name, description, days: TemplateDay[] }`, `TemplateDay { name, exerciseIds[], notes? }`. Cloning a template inserts one `Routine` per day.

| Template | Days |
|---|---|
| **StrongLifts 5×5** | Workout A, Workout B |
| **Full Body 3×/week** | Full Body (single day) |
| **Upper / Lower** | Upper A, Lower A, Upper B, Lower B |
| **Push / Pull / Legs** | Push, Pull, Legs |

### `lib/exerciseInstructions.ts`
`EXERCISE_INFO: Record<uuid, {instructions}>` — short "how to perform" text for the most common ~60 seed exercises, keyed by seed UUID. `getExerciseInfo(uuid)` returns the entry or `null` (UI falls back to a generic tip).

### `lib/exerciseMeta.ts`
- `MUSCLE_FILTERS` / `EQUIPMENT_FILTERS` — `{label, value}` lists (with an "All" option) for filter chips.
- `MUSCLE_COLORS: Record<MuscleGroup, hex>` — the canonical color per muscle (chest red, back blue, shoulders purple, etc.), used for chips and chart strokes app-wide.

### `lib/measurementTypes.ts`
`MEASUREMENT_TYPE_DEFS` — 17 predefined body metrics (weight & height flagged `primary`; body fat, muscle mass, chest, waist, hips, neck, shoulders, L/R bicep/forearm/thigh/calf), each `{type, label, defaultUnit, primary?}`. `getMeasurementDef(type)` looks one up.

---

## 8. State management (Zustand stores)

### `store/sessionStore.ts` — the live workout engine
Holds the in-progress workout entirely in memory **and** mirrors every change to Dexie, so a session survives a reload/crash.

**State:** `hydrated`, `workout: Workout|null`, `exercises: SessionExercise[]` (`{exercise, restSeconds, supersetGroup?}`), `sets: WorkoutSet[]`, `pauseStartedAt`, `pausedTotalMs`, `restTimer: RestTimer|null` (`{exerciseUuid, startedAt, endAt, duration}`), `prFlags: Record<setUuid, PRFlags>`.

**Persistence of order:** exercise order + superset grouping are serialized to the `settings` table under key `active_session_order` (v2 format `{uuid, supersetGroup?}[]`, backward-compatible with the old `string[]`).

**Lifecycle:**
- `resumeActive()` — on boot, finds the most-recent `active` workout, reloads its live sets, rebuilds exercise order (from the persisted order, falling back to set order), restores per-exercise rest. Sets `hydrated`.
- `startWorkout(exs)` — new single workout named by time of day ("Morning/Afternoon/Evening Workout"); seeds one empty set per exercise.
- `startFromRoutine(routine, exs)` — same but named after the routine, `type: 'routine'`.
- `finishWorkout()` — soft-deletes empty/untouched sets, marks workout `finished` with `endedAt`, clears the order key, returns the finished workout (caller navigates to summary).
- `discardWorkout()` — hard-deletes the workout and its sets.

**Editing:** `renameWorkout`, `addExercises` (dedupes, seeds an empty set each), `removeExercise` (soft-deletes its sets, cleans up an orphaned superset partner), `setExerciseRest`.

**Supersets:** `groupExercises(a, b)` (reuses an existing group id or creates one), `ungroupExercise(uuid)` (dissolves the group if ≤1 member remains).

**Sets:** `addSet` (prefills weight/reps/rpe from the last set), `addWarmupSets(uuid, weights[], reps[])` (bulk-adds `warmup`-typed sets), `updateSet(uuid, patch)` (weight/reps/rpe/setType), `toggleSetComplete(uuid)`, `removeSet(uuid)` (renumbers remaining sets; removes the exercise if it was the last set).

**`toggleSetComplete` — the most important method.** On completing a set:
1. Stamps `completedAt`, writes to Dexie.
2. Starts the rest timer with that exercise's rest. **Superset rule:** only fires rest when all group members have an equal completed-set count (so you alternate, then rest).
3. Runs `detectSetPR()`; on a PR, stores flags, plays the fanfare, and triggers a vibration pattern.
On un-completing, clears any PR flag for that set.

**Timers:** `togglePause` / `elapsedMs()` (global session clock minus paused time), `startRest` / `adjustRest(±s)` / `clearRest` (rest timer). `DEFAULT_REST` from settings default (90s).

### `store/authStore.ts` — Supabase auth
State `{ user: User|null, initialized: boolean }`. Actions:
- `initialize()` — if no Supabase, marks `initialized` and returns; else restores the session via `getSession()`, subscribes to `onAuthStateChange`, and on every change calls `setSyncUser(user.id)` to (de)activate the sync engine.
- `signInWithGoogle/Apple` (OAuth, redirect to origin), `signInWithEmail`, `signUpWithEmail`, `signOut`.

### `store/syncStore.ts` — status pill
`{ enabled, status: 'idle'|'syncing'|'offline'|'error', lastSyncedAt }`. Drives `SyncIndicator`.

---

## 9. Offline-first cloud sync engine

Files: `src/lib/sync/engine.ts`, `src/lib/sync/tables.ts`. Only active when signed in.

### Synced tables (`tables.ts`)
`SYNC_TABLES` lists 9 personal tables: exercises (`customOnly`), routines, workouts, sets, foods (`customOnly`), foodEntries, dailyGoals, measurements, measurementEntries. Each config has `name` (Dexie name === Supabase table name), a `table()` accessor, the `columns` that travel, and optional `customOnly` (exercises/foods push only `isCustom` rows — seed data re-seeds per device).

- **`settings` is intentionally NOT synced** (no timestamps; holds the ephemeral active-session order which references workouts that may not exist on another device).
- **`progressPhotos`, `savedMeals`, `recipes`, `waterEntries` are NOT in the sync set** (local-only at this stage).
- `toRemote(cfg, rec, userId)` maps a Dexie row → Supabase row (`undefined → null`, adds `supabaseUserId`). `fromRemote` maps back (strips sync-only columns; `null → undefined` except `deletedAt` stays `null`).

### The sync loop (`engine.ts`)
- **`setSyncUser(userId)`** — called by authStore. Activates/deactivates, installs hooks, and triggers an immediate full sync on sign-in.
- **Change capture (zero edits to write paths):** `installLocalChangeHooks()` attaches Dexie `creating`/`updating`/`deleting` hooks to every synced table; any change calls `scheduleSync()`. This is why no existing write site needed modification.
- **`scheduleSync(delay=1500ms)`** — debounced; coalesces bursts into one sync.
- **Network listeners** — `online` triggers an immediate sync; `offline` sets status.
- **`runSync()`** — single-flight (a request during a run sets `runAgain`). Reads the per-user `syncState` cursor, then:

**Push (`pushAll`):** for each table, upserts rows whose `updatedAt > lastPushedAt` (watermark, local clock), in chunks of 500, on conflict `uuid`. Returns the max pushed `updatedAt`.

**Pull (`pullAll`):** for each table, pages (500/page) rows where `server_updated_at > cursor` (the **server** clock, set by a Postgres trigger — robust to device clock skew), ordered by `server_updated_at, uuid`. Each row goes through `mergeRow`.

**LWW merge (`mergeRow`):** compares incoming `updatedAt` to the local row; **strict-newer wins** (skips equal/older). Skipping equal rows means our own echoed writes don't re-trigger the change hooks → no redundant sync loop.

**Watermark advance:** after a cycle, `lastPushedAt = max(prev, pushedMax, min(pulledMax, syncStart))`. Pulled rows are already on the server so they must never be re-pushed; the `min(..., syncStart)` clamp stops a future-clocked peer from pushing the watermark past genuine local edits.

---

## 10. Social layer

File: `src/lib/social.ts`. **Online-only, direct Supabase queries**, isolated from the personal sync engine. Every function degrades to empty/no-op without a client or network (only profile/friend-add functions surface errors to the UI).

**Types:** `WorkoutPrivacy` (`public|friends|private`), `SocialProfile`, `FriendProfile` (public, no shareCode), `Friend`, `FeedItem`, `LeaderboardRow`, `TopExercise`, `SharePR`. `AVATAR_COLORS` = 8-color palette.

**Own-profile cache:** the signed-in user's profile is cached in the Dexie `settings` table under `social_profile`, so the finish-share flow knows the privacy setting even offline. `getCachedProfile()` / `setCachedProfile()`.

**Profile:**
- `fetchMyProfile()` — server fetch, refreshes cache.
- `normalizeUsername(raw)` — lowercase, `[a-z0-9_]`, ≤20 chars.
- `createProfile(username, displayName, tier)` — validates ≥3 chars, generates an unambiguous base-32 `shareCode` (no 0/O/1/I), picks a deterministic avatar color from the user id, inserts; retries up to 4× on shareCode collisions; throws "That username is taken." on a username unique-violation.
- `setWorkoutPrivacy(privacy)` — updates the profile **and** propagates `privacy` to all of the user's existing `workout_shares`, plus the cache.

**Friends:**
- `searchProfiles(query)` — `ilike username%`, excludes self, limit 15.
- `addFriendByCode(code)` — cleans the code, calls RPC `add_friend_by_code`, returns the new friend.
- `addFriendById(targetId)` — RPC `add_friend`.
- `getFriends()` — reads `friendships` where the user is `user_a` or `user_b`, resolves the *other* side to profiles, sorted by username.
- `removeFriend(friendshipId)`.

**Feed:**
- `getFeed()` — fetches up to 60 `workout_shares` from friends (`deletedAt is null`, ordered by `startedAt desc`), then a single reactions query to compute per-share reaction counts and whether the current user reacted. Returns enriched `FeedItem[]` with author profiles.
- `toggleReaction(shareUuid, reacted)` — deletes or upserts a 💪 reaction (unique per share+user).

**Leaderboard:**
- `getLeaderboard(weekStartMs)` — aggregates shares since week start across me + friends into `{volume, workouts, prs, streak(=distinct days)}` per person.

**Sharing a finished workout:**
- `topExercisesFor(workoutUuid, limit=3)` — top exercises by volume from local sets.
- `shareWorkout(summary, privacy)` — upserts a **denormalized summary** into `workout_shares` (uuid === local workout uuid → idempotent). Never the raw sets.
- `maybeShareWorkout(summary)` — called from `WorkoutSummaryPage`. Shares only if a social profile exists (implicit consent — **no profile means nothing leaves the device**), using the cached privacy. Silent on any failure.

---

## 11. Supabase backend (SQL schema, RLS, RPCs)

File: `supabase/schema.sql`. **Manual step:** must be run once in the Supabase SQL editor. Until then, the app shows a harmless "Sync error" / empty Friends tab; local Dexie is untouched.

### Personal sync tables
9 tables (exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, measurements, measurementEntries). Design:
- **Quoted camelCase columns** matching the TS fields 1:1 (zero client mapping).
- Epoch-ms fields are `double precision` (exact < 2^53, returned to JS as a number).
- **`server_updated_at timestamptz`** stamped by a `before insert/update` trigger (`set_server_updated_at`) — the cursor the client pulls against.
- A `do $$ … $$` block applies uniformly to all 9: server-cursor + per-user indexes, the stamp trigger, `grant select/insert/update/delete to authenticated`, `enable row level security`, and a single `own_rows` policy: `auth.uid() = "supabaseUserId"` for both `using` and `with check`.

### Social tables
- **`profiles`** — `id (= auth uid), username unique, displayName, shareCode unique, avatarColor, workoutPrivacy (default 'friends'), tier (default 'lifetime'), timestamps`.
- **`friendships`** — symmetric, one row per pair stored ordered (`check user_a < user_b`, `unique(user_a, user_b)`), plus `requestedBy`.
- **`workout_shares`** — `uuid (= workout uuid), userId, name, startedAt, durationMs, volume, setCount, exerciseCount, prCount, muscleGroups jsonb, topExercises jsonb, prs jsonb, privacy, deletedAt (soft-delete so un-sharing propagates), updatedAt`.
- **`reactions`** — `shareUuid, userId, emoji (default 💪), unique(shareUuid, userId)`.

### Security helpers (SECURITY DEFINER, avoid recursive RLS)
- `are_friends(a, b)` — does an ordered friendship row exist.
- `can_view_share(p_share)` — owner OR (`deletedAt is null` AND (`public` OR (`friends` AND are_friends))).
- `add_friend_by_code(code)` — befriend a share-code owner; symmetric, idempotent (`on conflict do nothing`), rejects self-add; returns the friend's public profile.
- `add_friend(target)` — befriend by id; same guarantees.

### Social RLS policies
- **profiles:** SELECT to all authenticated (username discovery); modify only own (`auth.uid() = id`).
- **friendships:** members may SELECT/DELETE; INSERT only when `requestedBy = auth.uid()` and a member.
- **workout_shares:** owner full access; others SELECT by `public` or (`friends` + `are_friends`), never when soft-deleted.
- **reactions:** SELECT if `can_view_share`; INSERT only own + viewable; DELETE only own.

This split guarantees a social-policy bug can't expose raw private workout/set rows — those stay locked to `auth.uid() = supabaseUserId`.

---

## 12. Auth

File: `src/lib/supabase.ts`. `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` — **null if env vars are absent**, so the app runs fully offline without Supabase. `supabaseConfigured` boolean gates auth UI. Auth methods live in `authStore` (§8); sign-in surfaces on `LandingPage` and `ProfilePage`. OAuth (Google/Apple) + email/password.

---

## 13. App shell & routing

### `main.tsx`
Calls `ensureExercisesSeed()`, mounts `<App/>` inside `<BrowserRouter>` and `<StrictMode>`, imports `index.css`.

### `App.tsx`
- Reads `theme` + `accentColor` from `useSettings()`; subscribes to auth (`initialize`, `user`, `initialized`).
- **Effects:** resume active session + init auth on mount; show onboarding once (`onboarded && !isSetupDone()`); apply `data-theme`; apply accent CSS vars.
- **First-run gate:** if `initialized && !user && !onboarded` → render `LandingPage` (guest button sets `gymbro_onboarded`).
- **Onboarding:** renders `OnboardingSheet` overlay when triggered.
- **Layout:** `<AnimatePresence>` page transitions (fade/slide, keyed by pathname) wrapping a `<Suspense>` `<Routes>`; a global `<RestTimerBar/>`; the fixed bottom **tab bar** (Workout `/`, Routines `/routines`, Food `/food`, Friends `/social`, Settings `/settings`).
- **Lazy-loaded routes** (own bundles): ProgressPage, ExerciseProgressPage, MeasurementPage, ProgressPhotosPage, ReportsPage, SocialPage.

### Route table
| Path | Component |
|---|---|
| `/` | WorkoutPage (dashboard) |
| `/session` | SessionPage (live workout) |
| `/exercises` | ExercisesPage |
| `/routines` | RoutinesPage |
| `/routines/new`, `/routines/:uuid` | RoutineEditPage |
| `/history` | HistoryPage |
| `/history/:uuid` | HistoryDetailPage |
| `/summary/:uuid` | WorkoutSummaryPage |
| `/progress` | ProgressPage |
| `/progress/photos` | ProgressPhotosPage |
| `/progress/reports` | ReportsPage |
| `/progress/:exerciseUuid` | ExerciseProgressPage |
| `/measurements/:uuid` | MeasurementPage |
| `/food` | FoodPage |
| `/social` | SocialPage |
| `/settings` | ProfilePage |

---

## 14. Pages

### WorkoutPage (`/`) — dashboard
Greeting by time of day. Cards: **Today's Nutrition** (calories vs goal + protein/carbs/fat macro bars, live from foodEntries), **Streak** (consecutive workout days, flame) + **This Week** (Mon–Sun dots, ✓ on workout days, today highlighted), **Recent PR** celebration (amber gradient, links to that exercise's progress; from `getRecentPRs(21, 2)`), **Resume/Start Workout** (resume if a session is active, else Start + quick Log Food), **Last Workout** card (→ history), and nav cards to Progress, Exercise Library, History.

### SessionPage (`/session`) — live workout
The core logging screen. Sticky header: editable workout name, live `elapsedMs` clock, pause/resume, completed-set count, **Finish** button. Redirects home if no active workout.
Per exercise card: name + muscle chip; tool buttons **Info** (ExerciseDetailSheet), **Warm-up** (WarmupSheet, prefilled with the heaviest set weight), **Superset link/unlink**, **remove**; per-exercise rest stepper (±15s); a set table rendered via `SetRow`; **Add set**. Supersets render with a green left border, a "SUPERSET" bracket, and connectors between members. Shows **last performance** per exercise ("what to beat"). Sheets: ExercisePicker (add), PlateCalculatorSheet, WarmupSheet, ExerciseDetailSheet, superset-partner picker, and finish/discard confirmation sheets. Finishing → `/summary/:uuid`.

### WorkoutSummaryPage (`/summary/:uuid`)
Celebration screen (Framer Motion). Computes `getWorkoutSummary`. Animated check hero, stat grid (duration/volume/sets/exercises), muscle-group chips, and a **PRs** list (each labeled "New estimated 1RM" or "New rep-max" with weight×reps and e1RM). Plays the fanfare when PRs exist. **Side effects:** `maybeShareWorkout` (once per workout, if a social profile exists). **Share** button (Web Share API / clipboard) and **Done**.

### RoutinesPage (`/routines`)
Create Routine button; **My Routines** list (tap to edit, Start to launch — replaces an active workout after confirmation); **Program Templates** section listing the 4 built-in programs with a **Clone** action (adds one routine per day, success toast). Confirmation sheets for replace and clone.

### RoutineEditPage (`/routines/new` | `/routines/:uuid`)
Name + notes inputs; ordered exercise list with up/down reorder and remove; **Add Exercise** (ExercisePicker). Save validates name + ≥1 exercise. Edit mode adds a Delete (soft) action.

### ExercisesPage (`/exercises`)
The library. Sticky header with **Add** (custom exercise via AddExerciseForm), search, horizontally-scrolling **muscle** and **equipment** filter chips, and a live result count. Each row: color bar by muscle, name, ★ for custom, muscle + equipment chips, and an **Info** button (ExerciseDetailSheet). Live query auto-reflects new custom exercises; shows the custom count in the title.

### HistoryPage (`/history`)
List of finished workouts (newest first). Each card: name, date+time, duration, total volume, exercise & set counts → tap to `/history/:uuid`. Empty state offers to start a first workout.

### HistoryDetailPage (`/history/:uuid`)
Summary card (date/time, duration, volume, ex/set counts) + per-exercise groups (ordered by when each exercise first appeared) listing each set's weight×reps, RPE, and ✓. Tapping an exercise → its progress page.

### ProgressPage (`/progress`)
Top quick-access cards to **Photos** (`/progress/photos`) and **Reports** (`/progress/reports`). **Weekly Volume** bar chart (`getWeeklyVolume(10)`, peak week highlighted). **Exercises** list (`getExercisesWithData`) sorted by recency, each showing session count, last date, best e1RM → tap to `/progress/:exerciseUuid`.

### ExerciseProgressPage (`/progress/:exerciseUuid`)
Headline best e1RM + total gain; an **e1RM-over-time** line chart (`getExerciseE1RMSeries`); a **Rep Maxes** table (`getExerciseRepMaxes` — heaviest weight at each rep count, with derived e1RM).

### ProgressPhotosPage (`/progress/photos`) — Phase 4
**Timeline** and **Compare** tabs. Add resizes the picked image to ≤1000px JPEG (canvas, quality 0.82) and stores it in IndexedDB **only** (`progressPhotos`) — zero server cost. Timeline = dated cards with thumbnail + delete-with-confirm. Compare = two date dropdowns rendering before/after side-by-side. Empty states gate each tab (≥1 / ≥2 photos).

### ReportsPage (`/progress/reports`) — Phase 4
**This Week / This Month** toggle (`getPeriodStats` over `weekRange()`/`monthRange()`). Stat cards: workouts, total volume, time trained, avg daily calories. **Top Exercises** (ranked 1–3 by volume). **Body Changes** (measurement start→end deltas in the period, colored by direction). **Share** button → Web Share API or clipboard summary.

### MeasurementPage (`/measurements/:uuid`)
Current value headline; **Trend** line chart (when ≥2 entries); full entry **History** with per-entry delete. **Log** opens a sheet (value + date, date capped at today). New entries use random UUIDs (multiple per day allowed); the measurement itself uses the deterministic singleton UUID for predefined types.

### FoodPage (`/food`)
Per-day diary with a date switcher (can't go past today). **Daily summary** card (calories vs goal + macro bars; Edit goals & Recipes shortcuts). **Water** tracker (current vs 2500ml goal, +250/+500 buttons → `waterEntries`). Four **meal sections** (breakfast/lunch/dinner/snack), each listing entries (food, brand, grams, per-entry macros, kcal, delete) with **Add food** (LogFoodSheet) and **Save** (save the meal's foods as a reusable `SavedMeal`). Sheets: LogFoodSheet, EditGoalsSheet (writes `goal-<date>` singleton, soft-deletes stale duplicates), RecipeBuilderSheet, save-as-meal. Runs `consolidateDailyGoals()` on mount. Macros via `macrosForGrams`.

### SocialPage (`/social`) — Phase 3
Gated states in order: Supabase not configured → info; not signed in → prompt to sign in; profile loading; **no profile → ProfileSetup** (username + display name). When ready: header (avatar, @username, **Manage** → FriendsSheet), **Feed/Leaderboard** tabs. Feed = `FeedCard` list with optimistic 💪 reactions. Leaderboard = metric toggle (Volume / Workouts / Days-streak) ranking me + friends for the current week.

### LandingPage (first run)
Full-screen branded splash. With Supabase: Google/Apple OAuth, email sign-in/up, or **Continue as Guest** ("data stays on this device"). Without Supabase: a single **Get Started** (guest). `onGuest` dismisses and marks onboarded.

### ProfilePage (`/settings`)
- **Auth card** — signed-in user (avatar, name/email, `SyncIndicator`, sign out) or `SignInCard` (OAuth/email).
- **Achievements** — `BadgesSection`: a 3-column grid of all 14 badges; earned ones colored by tier (bronze/silver/gold), locked ones muted with a lock icon. Live from `computeAchievementStats` + `getEarnedBadgeIds`.
- **Body Measurements** — live cards (latest value, unit, delta vs previous colored green/red, date) → tap to MeasurementPage; **Add Measurement** (predefined or custom). Runs `consolidateMeasurements()` reactively.
- **Preferences** — weight unit (kg/lb), default rest time (±15s).
- **Appearance** — theme (system/light/dark) + **accent color** swatches (Phase 5).
- **Notifications** (Phase 5) — `NotificationsRow` toggle requesting the Notification permission; disabled/explained when unsupported or denied; notes the iOS PWA limitation.
- **Data** — Workouts/Routines **PDF** & **CSV** exports, plus full **JSON** backup export/import (merge restore with confirmation). Backup format `version: 2`.
- **About** — version info, iOS install hint.

---

## 15. Components

- **BottomSheet** — `{open, onClose, children, title?}`. The shared modal primitive (Framer Motion spring slide-up + dim overlay; tap-outside closes). **Ref-counted body lock** keeps `html.sheet-open` set while *any* sheet is open so nested sheets don't prematurely unlock the page.
- **SetRow** — one set in the session table. Inputs for weight/reps/RPE (local state, propagated via `onChange`); a set-number button that **cycles set type** (normal→warmup→dropset→failure, with W/D/F colored labels); a plate-calculator button; a complete (✓) toggle (unlocks audio on tap for iOS); a remove (✕). Shows an animated **PR flag** ("New 1RM PR"/"Weight PR") when completed with a PR. Placeholders show last-time weight/reps.
- **ExercisePicker** — `{open, onClose, onConfirm, excludeUuids?, title?, confirmLabel?}`. Multi-select exercise chooser with search + muscle chips; resets on open (render-phase pattern); inline **Create custom exercise** (AddExerciseForm) that auto-selects the new exercise; confirm returns the selected `Exercise[]`.
- **AddExerciseForm** — `{onSaved, onCancel}`. Creates a custom exercise (name, primary muscle, equipment, category). Persists to Dexie, returns it. Used by the library and the picker.
- **AddFoodForm** — `{onSaved, onCancel}`. Creates a custom food (name, brand, kcal/100g + macros). Persists, returns it.
- **LogFoodSheet** — the food-logging hub. **Three tabs:** *My Foods* (recent-first sorted, search, **Quick Add** chips, barcode scan button, create-new), *Online* (Open Food Facts search; logged results are saved to My Foods, with id `barcode-<code>` when scanned), *Meals* (one-tap log a `SavedMeal`). After picking a food → **grams mode** (live macro preview) → logs a `FoodEntry`. Hosts the BarcodeScanner.
- **RecipeBuilderSheet** — build/edit a `Recipe` (name, servings, ingredients with grams). Computes per-serving macros live. On save, also **mirrors the recipe as a `Food`** (id `recipe-<uuid>`) so it's loggable from the picker like any food.
- **BarcodeScanner** — full-screen camera overlay. **Dynamically imports `@zxing/browser`** (keeps it out of the main bundle), decodes from the video device, vibrates + returns on a hit, falls back to **manual barcode entry**, and handles camera-permission denial gracefully.
- **PlateCalculatorSheet** — `{open, onClose, initialWeight?}`. Given target + bar weight and the configured plate set, greedily computes plates per side, draws a **color-coded plate visual**, and warns on a non-loadable remainder. Reads `barWeight`/`plateWeightsKg`/`units` from settings.
- **WarmupSheet** — `{open, onClose, workingWeight, units, onAddSets?}`. Suggests a 40%/60%/80% ramp (8/5/3 reps) rounded to 2.5 and floored at bar weight; optional **Add to workout** bulk-adds them as warmup sets.
- **ExerciseDetailSheet** — `{open, onClose, exercise}`. Shows equipment + category chips, primary/secondary muscle chips, and the "How to perform" text (`getExerciseInfo`, generic fallback).
- **RestTimerBar** — global rest overlay (mounted at app root so it survives navigation). Large circular SVG countdown ring (amber → green at zero), ±15s adjust, skip/dismiss, a full-screen **"GO!"** flash + beep + vibration when rest ends, and auto-dismiss 5s after completion. Uses `useNow(…, 100)`.
- **OnboardingSheet** (Phase 5) — first-run wizard: unit choice (kg/lb) → optional starting body weight (creates the weight measurement + first entry) → done. Skippable at any step. `isSetupDone()`/`markSetupDone()` persist `gymbro_setup_v1` in localStorage.
- **Gated** — `{feature, fallback?, children}`. Renders children if `canAccess(feature, tier)`. Currently always passes (everyone is `lifetime`) — the publish-time switch.
- **SyncIndicator** — small status pill (syncing/idle/offline/error) from `syncStore`; only renders when signed in.
- **Avatar** — initial-letter circle with a per-user accent color (no image upload, zero cost).
- **FeedCard** — `{item, units, onReact}`. A friend's shared workout: author (avatar, @username, time-ago), PR-count badge, workout name, stat row (duration/volume/sets), muscle chips, an expandable **Details** section (top exercises + PRs), and a 💪 **react** button (count + my-state styling).
- **FriendsSheet** — `{open, onClose, profile, onChanged}`. Your **friend code** (copy/share), **add a friend** by code or live username search, **privacy** toggle (public/friends/private, propagated to existing shares), and the **friends list** with remove.

---

## 16. Library / utility modules

### `lib/settings.ts`
`AppSettings = { units, defaultRestSeconds, theme, accentColor, notificationsEnabled, barWeight, plateWeightsKg }`. `DEFAULT_SETTINGS` (kg, 90s, dark, green, notifications off, 20kg bar, `[25,20,15,10,5,2.5,1.25]`). `ACCENT_PALETTES` (green/blue/purple/orange/red → `{main, dim, hex}` rgb triplets). `getSetting`/`setSetting` (Dexie `settings` table), and `useSettings()` (live, with defaults). Types `Unit`, `ThemePreference`, `AccentColor`.

### `lib/prs.ts` — the strength-math core
PRs are **derived from sets** (never stored), so editing/deleting a set retroactively corrects every record.
- `estimate1RM(weight, reps)` = `weight × (1 + reps/30)` (Epley). `roundN`.
- `isScoringSet` — live, completed, positive weight & reps.
- `PRFlags {e1rm, weight}`, `hasPR`. `detectSetPR(set)` — compares a just-completed set against all prior scoring sets for that exercise: new all-time e1RM (first-ever counts) and/or new heaviest weight at that exact rep count.
- `getRecentPRs(days, limit)` — replays history chronologically, emitting an event each time an exercise's all-time e1RM rises; returns the most recent.
- `getExerciseE1RMSeries(uuid)` — best e1RM per workout, by date (line chart).
- `getExerciseRepMaxes(uuid)` — heaviest weight at each rep count (rep-max table).
- `getWeeklyVolume(weeks)` — Σ(weight×reps) per Monday-week, including empty weeks.
- `getExercisesWithData()` — per-exercise aggregate (best e1RM/weight/reps, last date, session count).
- `getWorkoutSummary(uuid)` — authoritative finished-workout summary: volume, set/exercise counts, muscle groups, and a PR list. PRs are judged against every *earlier-finished* workout, then the within-session progression is replayed so the best lift of the day wins; weight PRs already covered by an e1RM PR are dropped.

### `lib/achievements.ts` (Phase 4)
`ALL_BADGES` — 14 badges in 4 families: **workout count** (1/10/25/50/100), **streak** (7/30/100 days), **PRs** (1/10/25), **volume** (10k/50k/100k kg). Each `{id, title, description, icon, tier}`. `computeAchievementStats()` → `{workoutCount, longestStreak, currentStreak, prCount, totalVolumeKg}` (streaks from distinct workout dates; PR count from rising all-time e1RMs). `getEarnedBadgeIds(stats)` → the unlocked set.

### `lib/reports.ts` (Phase 4)
`weekRange()` (current Mon–Sun) / `monthRange()`. `getPeriodStats(startMs, endMs)` → `{workoutCount, totalVolumeKg, totalDurationMs, topExercises[≤3], avgDailyCalories, measurementDeltas[]}` for that window.

### `lib/foodCalc.ts`
`macrosForGrams(food, grams)` (rounds calories to int, macros to 0.1). `todayStr()`, `offsetDate(dateStr, days)`, `formatDateDisplay` (Today/Yesterday/weekday). `DEFAULT_GOALS` (2000 kcal / 150P / 200C / 70F).

### `lib/format.ts`
`formatDuration` (H:MM:SS/MM:SS clock), `formatDurationShort` (1h 23m / 45m / 30s), `formatDateLong`, `formatTime`, `formatVolume(kg, unit)`.

### `lib/history.ts`
`getLastPerformance(exerciseUuid, excludeWorkoutUuid?)` — most recent completed set for "what to beat" in a session.

### `lib/openFoodFacts.ts`
`searchFoodsOnline(query)` (CGI search, ≤20 results, 8s timeout) and `lookupBarcode(barcode)` (v2 product API). `parseProduct` extracts name, brand, and per-100g kcal/protein/carbs/fat; rejects entries with no name or non-positive calories.

### `lib/exportCsv.ts` (Phase 5)
`exportWorkoutsCsv(units)` — one row per set (Date, Workout, Exercise, Set#, Weight, Reps, Type, RPE), CSV-escaped, downloaded as `gymbro-workouts.csv`. `exportRoutinesCsv()` — routine/order/exercise rows.

### `lib/exportPdf.ts` (Phase 5)
Builds a styled HTML document and opens it in a new window to trigger the browser's **Print → Save as PDF** (no PDF library, zero dependency). `exportWorkoutsPdf(units)` — per-workout tables (date, duration, volume, set breakdown with set-type tags & RPE). `exportRoutinesPdf()` — numbered exercise lists. HTML-escapes all user content; warns if pop-ups are blocked.

### `lib/feedback.ts`
Web Audio (lazy `AudioContext`, iOS-unlock via `unlockAudio()` on a user gesture). `playBeep()` (two ascending beeps — rest over), `playFanfare()` (C–E–G–C arpeggio — PR), `vibrate(pattern)` (Android only; iOS ignores). Documents the iOS background-throttle caveat.

### `lib/chartTheme.ts`
Shared recharts constants: `CHART_GREEN`, `CHART_MUTED`, `CHART_GRID`, and `tooltipStyle`.

### `lib/tier.ts`
`FEATURES` maps features → required tier (`aiCoach`/`progressPhotos`/`themes` = `pro`; everything else `free`). `TIER_RANK` (free<pro<lifetime). `canAccess(feature, tier)`. `useTier()` reads the `tier` setting, **defaulting to `lifetime`** (so nothing is locked today).

### `lib/useNow.ts`
`useNow(active, intervalMs=1000)` — a `Date.now()` value that ticks while `active` and re-syncs on tab foreground (counters iOS background throttling). Powers the session clock and rest timer.

### `lib/supabase.ts`
The optional client + `supabaseConfigured` (see §12).

---

## 17. Feature catalogue by roadmap phase

The app implements the full v3 roadmap in `CLAUDE.md`. Mapping features → code:

**Phase 0 — Tier-ready architecture:** `lib/tier.ts` (FEATURES, useTier, canAccess), `components/Gated.tsx`, `tier` setting (default `lifetime`). Nothing locked.

**Phase 1 — Workout depth:**
- *Plate calculator* — `PlateCalculatorSheet` (settings-configurable plates/bar), reachable from any weight input via `SetRow`.
- *Set types* — `SetType` (normal/warmup/dropset/failure) cycled in `SetRow`; **supersets** via `supersetGroup` in `sessionStore` (grouping, alternating rest logic, bracket UI).
- *Warm-up calculator* — `WarmupSheet` (40/60/80% ramp, add-to-workout).
- *Program templates* — `data/programTemplates.ts` + clone flow in `RoutinesPage`.
- *Exercise detail* — `ExerciseDetailSheet` + `exerciseInstructions.ts` (muscles + how-to).

**Phase 2 — Food features:** online search & barcode (`openFoodFacts.ts`, `BarcodeScanner`, `LogFoodSheet`), saved meals (`SavedMeal`, FoodPage save flow), recipe builder (`RecipeBuilderSheet`, mirrored as a Food), water tracking (`waterEntries`, FoodPage).

**Phase 3 — Social:** `lib/social.ts`, `SocialPage`, `FeedCard`, `FriendsSheet`, `Avatar`, the social Supabase tables + RLS + RPCs in `schema.sql`. Privacy public/friends/private; friends by code or username; 💪 reactions; weekly leaderboard.

**Phase 4 — Progress & motivation:** achievements (`achievements.ts`, ProfilePage `BadgesSection`), progress photos (`ProgressPhotosPage`, local IndexedDB only), reports (`reports.ts`, `ReportsPage`).

**Phase 5 — Polish & QoL:** data export JSON/CSV/PDF (`exportCsv.ts`, `exportPdf.ts`, ProfilePage), accent themes (`ACCENT_PALETTES`, App.tsx), onboarding (`OnboardingSheet`), notifications toggle (ProfilePage `NotificationsRow`).

*(Earlier "Phase 6" cloud sync — `lib/sync/*`, `syncStore`, the personal Supabase tables — predates the v3 numbering and is fully in place.)*

---

## 18. Tier system (publish-ready architecture)

Everything is **free and unlocked** today — there are no paywalls or payment screens. The plumbing exists so publishing later is a flag flip:
- Every profile has a `tier` (`free|pro|lifetime`), defaulting to `lifetime`.
- `FEATURES` already marks `aiCoach`, `progressPhotos`, `themes` as `pro`.
- `<Gated>` wraps gated features but always renders today.
- To activate tiers later: change the `useTier()` default / new-signup default to `free`, and `Gated` starts enforcing. **Not built (deliberately):** Stripe/payments, AI features, redeem-code screen — all documented as FUTURE in `CLAUDE.md`.

**Zero-cost guarantee:** all features are local code or Supabase free-tier text data. Progress photos are stored only in IndexedDB (never Supabase Storage). Open Food Facts is free/no-key. No paid APIs.

---

## 19. Build, PWA & deployment

- **Vite config** (`vite.config.ts`): React + Tailwind + `VitePWA`. Manifest: name GymBro, theme `#22c55e`, bg `#0a0a0f`, `standalone`, portrait, 192/512 + maskable icons. Workbox precaches `js/css/html/ico/png/svg/woff2`; Google Fonts cache-first. `registerType: 'autoUpdate'`.
- **`index.html`** — viewport `viewport-fit=cover`, iOS web-app meta (`apple-mobile-web-app-capable`, `black-translucent` status bar), theme color, icons.
- **Build:** `tsc -b && vite build` (strict TS gate). Recharts/Framer push the main bundle past 500kB (warned, acceptable for a PWA); progress/social/measurement pages are code-split.
- **Deploy:** Vercel auto-deploys on push to `main` (repo `PipAndrux/GymBro`).
- **Verification convention:** run `npm run build` (not just `tsc`) before pushing.

---

## 20. Known limitations

- **iOS rest-timer alerts** only fire reliably while the app is open and on-screen — iOS throttles background timers (sound/vibration fire on return to foreground). `useNow` re-syncs on foreground to mitigate drift.
- **Vibration** (`navigator.vibrate`) is Android-only; iOS Safari ignores it.
- **iOS install** requires the manual Share → Add to Home Screen step (no install prompt).
- **iOS PWA notifications** — no background notifications (surfaced inline in the toggle).
- **Social requires Supabase + network** (online-only by design); without them the Friends tab degrades to an info state.
- **Manual SQL step** — `supabase/schema.sql` must be run once in Supabase for personal sync and social to work; until then the app is fully functional locally.
- **Bundle size** — main JS chunk is large (recharts + framer-motion); mitigated by lazy routes and Workbox precache.

---

*Generated by reading every source file in `src/`, plus `supabase/schema.sql` and the build config. For the product roadmap and build rules, see `CLAUDE.md`.*
