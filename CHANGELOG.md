# GymBro — v2 Changelog

The v2 overhaul that took the app from "functional prototype" to a polished,
energetic fitness app. Each phase below is a shippable, self-contained step.

---

## Phase 1 — Visual identity overhaul

The foundational redesign: a dark-first, green-accented identity replacing the
flat indigo theme.

**Color system**
- Accent changed from indigo `#6366f1` → vibrant green `#22c55e` everywhere.
- New amber token `#f59e0b` for rest timers, warnings and streaks.
- Dark is now the true default (`:root` ships the dark palette — no white flash on load),
  with rich blue-black surfaces (`#0a0a0f` / `#15151e` / `#1e1e2e`).
- Text: soft white `#f1f1f1` primary, muted `#8b8ba0` secondary.
- Light mode preserved via `data-theme="light"`; default theme setting changed
  `system` → `dark`.

**Typography & components**
- Bigger, bolder headers (28px/800); set inputs use tabular-nums at 16px/700 —
  numbers are the hero content.
- Tab bar: pill-shaped active icon background, backdrop blur.
- Cards gained elevation shadows; buttons got heavier weight, borders and a green
  focus glow; dashed "add set" border tinted green.

**Branding**
- Renamed **"Fit Tracker" → "GymBro"** everywhere (title, manifest, About, iOS meta).
- `theme_color` updated to green; calves muscle color moved off indigo → violet.

_Files: `src/index.css`, `src/lib/settings.ts`, `src/lib/exerciseMeta.ts`,
`src/components/RestTimerBar.tsx`, `src/App.tsx`, `vite.config.ts`, `index.html`,
`public/favicon.svg`._

---

## Phase 2 — Dashboard / Home screen

Replaced the flat "start workout" screen with a real, motivating dashboard.

- **Time-based greeting** ("Good morning/afternoon/evening").
- **Today's Nutrition card** — large calorie number + green progress bar, with
  protein/carbs/fat macro bars in their own colors, all live from the food diary.
- **Workout streak** — flame icon (lights up when > 0) + consecutive-day count.
- **This week** — Mon–Sun dot grid; green check for logged days, outlined for today.
- **Quick actions** — "Start Workout" + "Log Food" (collapses to a "Resume Workout"
  banner when a session is in progress).
- **Last Workout card** — name, date, duration, volume; taps through to history.
- All data live from Dexie — no spinners, fully offline.

_Files: `src/pages/WorkoutPage.tsx`._

---

## Phase 3 — Progress tracking & Personal Records

The "am I getting stronger?" phase. Charts, PR detection, and a rewarding finish.

**Architecture decision:** PRs are **computed from the `sets` table, never stored
separately**. Sets are the single source of truth, so editing or deleting a set
retroactively corrects every record with zero bookkeeping (and it matches the
Phase 6 sync model, which doesn't sync a PR table).

**3a — Personal Records**
- Estimated 1RM via Epley: `weight × (1 + reps/30)` — one comparable strength scalar.
- Live detection: completing a set checks it against every prior completed set for
  that exercise. A new best e1RM or a new heaviest-weight-at-that-rep-count fires a
  triangle-wave fanfare + celebratory vibration and tags the set.
- Animated gold **"🏆 New 1RM PR / Weight PR"** badge above the record set;
  un-completing or removing a set clears it.
- Dashboard recent-PR card (placeholder from Phase 2) wired to real data.

**3b — Progress charts (recharts)**
- **Overview** (`/progress`): weekly volume bar chart (last 10 weeks, top week
  highlighted) + a list of trained exercises with their best e1RM.
- **Per-exercise** (`/progress/:uuid`): estimated-1RM line chart in the muscle's
  color, best-e1RM/gain headline, and a full rep-max PR table.
- Reachable via a "Progress & Records" dashboard card and by tapping any exercise
  in a workout-history detail.
- recharts is **lazy-loaded** into a separate chunk (~98 KB gzip) so it only
  downloads on the Progress screens — the dashboard and initial load stay light.

**3c — Workout summary**
- Finishing a workout lands on a celebratory `/summary/:uuid` screen: animated
  checkmark, duration / volume / sets / exercises stats, muscle-group tags,
  highlighted new PRs, and a Share button (OS share sheet, clipboard fallback).

_Files: `src/lib/prs.ts` (new), `src/lib/chartTheme.ts` (new),
`src/lib/feedback.ts`, `src/store/sessionStore.ts`, `src/components/SetRow.tsx`,
`src/pages/WorkoutSummaryPage.tsx` (new), `src/pages/ProgressPage.tsx` (new),
`src/pages/ExerciseProgressPage.tsx` (new), `src/pages/SessionPage.tsx`,
`src/pages/WorkoutPage.tsx`, `src/pages/HistoryDetailPage.tsx`, `src/App.tsx`,
`src/index.css`._

**New dependency:** `recharts`.

---

## Still to come

- **Phase 4** — UX polish (prominent rest timer, color-coded macros everywhere,
  quick-add foods, empty states, transitions, skeletons).
- **Phase 5** — Auth + profile + body measurements (Supabase, optional login).
- **Phase 6** — Full cloud sync (last-write-wins across devices, offline-first).
