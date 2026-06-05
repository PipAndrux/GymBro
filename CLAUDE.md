# Build Prompt: "Fit Tracker" — Workout + Calorie Tracking PWA

> ## 📌 HOW TO USE THIS FILE (read me first)
> **Best setup:** save this file as **`CLAUDE.md`** in the root of your `GymBro` project folder. Claude Code automatically reads `CLAUDE.md` at the start of every session, so it always has the full plan — you never have to paste it again, even on a new day or after `/clear`.
>
> **First session ever:** open Claude Code in the GymBro folder and say:
> *"Read CLAUDE.md. First run `gh auth status` and confirm I'm pushing to PipAndrux/GymBro. Then build Phase 1 only, verify the checkpoint, commit and push, and stop for my review."*
>
> **Every phase after that:** just a short message, e.g. *"Phase 1 looks good — build Phase 2."* No need to re-paste anything.
>
> **New session / next day:** *"Read CLAUDE.md. We finished Phase 2 — continue with Phase 3."* It reads the file and knows the whole plan.
>
> **Saving usage:** start each phase on Sonnet; only switch to Opus high-effort for Phase 3 (see the model table below). After each push, check the live Vercel URL on your phone before greenlighting the next step — that's what prevents wasted debugging cycles.

---

> Build it **phase by phase** — finish and verify each phase before starting the next. Do not skip ahead. After each phase, run the dev server and confirm it works before continuing.

### Before starting — verify GitHub setup
Before Phase 1, confirm the GitHub connection is correct by running `gh auth status`. It must show the account **PipAndrux**. If it shows any other account, stop and tell me — do not push anywhere else. The repo this project pushes to is **https://github.com/PipAndrux/GymBro.git**. Set it as `origin` if not already set.

### Git identity — CRITICAL
**Always commit as `PipAndrux`.** Before the first commit of every session, verify:
```
git config user.name   → must show "PipAndrux"
git config user.email  → must show the PipAndrux GitHub email
```
If either is wrong, fix it before committing. **Never commit with Claude, Anthropic, or any other author name.** I do not want Claude appearing as a collaborator on my repo.

**Never add "Co-authored-by" lines to commit messages.** Commit messages should contain only a short description of the change — nothing else, no trailers, no co-author tags.

---

## 0. Project Overview

Build a **Progressive Web App (PWA)** that works on both Android and iOS (installable to home screen, runs in browser, no app store needed). It is a personal fitness app combining two tools:

1. **Workout Tracker** — exercise library, single workouts, reusable routines, live workout sessions with timers and set logging.
2. **Calorie / Food Tracker** — daily food diary with manual food entry (foods are saved and reusable, so repeat logging is fast). No barcode, no online search in this build.

The app is for me and a small group of friends (low traffic). It is **local-only** — each person keeps their own progress on their own device; no accounts, no cloud, no login. Prioritize: reliability, offline support, a clean and simple mobile UI, and data that persists locally on each user's device with a JSON export/import for backup.

### Non-negotiable constraints
- **PWA only** — no native build, no app store, free to host.
- **Clean, simple, app-like interface** — see the "Interface & Feel" section below. It should look tidy and pleasant and launch full-screen from the home screen, but stay minimal — no elaborate animations or gestures.
- **Mobile-first** — designed for phone screens primarily; usable but not optimized on desktop.
- **Offline-capable** — the whole app works without internet (it's local-only, no external APIs). This is a strength: no network dependency anywhere.
- **Local-first data** — each user's data lives in their browser via IndexedDB. No login, no accounts, no cloud sync. JSON export/import is the backup + device-transfer mechanism.

---

## 1. Tech Stack (use exactly this — chosen for PWA reliability + free hosting)

- **Framework:** React + Vite (fast, simple, great PWA support)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **PWA:** `vite-plugin-pwa` (handles service worker, manifest, offline caching)
- **Local database:** **Dexie.js** (clean wrapper over IndexedDB — handles large local data well)
- **Routing:** React Router
- **State:** Zustand (lightweight, simpler than Redux for this scope)
- **Icons:** lucide-react
- **Animations:** **Framer Motion** — used minimally, only for simple page fades/slides and the slide-up bottom sheet. Prefer plain CSS transitions where simpler. (No gesture library needed.)

Hosting: **Vercel** (free, connected to the GitHub repo, auto-deploys on every push to `main`).

---

## 1b. Interface & Feel (clean, functional, minimal effort — NOT over-engineered)

I want it **clean, simple, and nice to look at**, app-like but not elaborate. Do the high-impact basics well and skip the fancy stuff. Prioritize a tidy, consistent, easy interface over animation showmanship.

### Keep (high impact, low effort — these make it look polished and feel like an app)
- **Standalone full-screen PWA:** manifest `display: "standalone"`, theme-color, iOS meta tags (`apple-mobile-web-app-capable`, status-bar), apple-touch-icon, so it launches from the home screen with no browser bar.
- **Safe-area insets** (`env(safe-area-inset-*)`) so content and the bottom tab bar respect the notch and home indicator. Non-negotiable — without it, it looks broken on iPhones.
- **Bottom tab navigation** (4 tabs), clean and clear.
- **One simple, consistent design system:** a small token set (colors, spacing, radii, type scale), system font stack (`-apple-system, system-ui`), rounded cards, generous spacing, a single accent color. Consistency is what reads as "designed." Keep it calm and uncluttered.
- **Light + dark mode** following the system setting (cheap with tokens, looks great).
- **Pressed/active states** on buttons (slight scale or color shift) — instant tactile feedback, trivial to add.
- **Optimistic UI:** local saves reflect instantly, never a spinner for a local write.
- **Simple, smooth transitions:** basic page fade/slide between screens and a slide-up bottom sheet for "add set" / "add food" / "add exercise" dialogs. Keep these light — short, simple CSS/Framer Motion transitions, nothing elaborate.
- **Clean empty states:** a small icon + one line of text instead of blank screens.

### Skip (elaborate, higher effort, not worth it for a minimal app)
- ❌ Swipe-to-delete gestures → use a simple delete button instead.
- ❌ Pull-to-refresh → not needed (data is local, always current).
- ❌ Swipe-between-days / drag gestures → use simple prev/next buttons and tap.
- ❌ Spring-physics flourishes, shared-element transitions, fancy splash animations → a basic branded splash is enough.
- ❌ Haptics → optional; skip unless trivial.

### Tech note
Framer Motion can still be included for the basic page/sheet transitions, but keep usage minimal — simple `motion` fades/slides only. If plain CSS transitions are simpler for something, prefer CSS. `@use-gesture/react` is **not needed** (no swipe gestures) — remove it from the stack.

### Honest platform note (one line in README)
On iOS, install is a manual Safari "Share → Add to Home Screen" step (no install button), and background/locked-screen timers are unreliable — rest-timer alerts fire reliably only while the app is open and on screen. Everything visual works fine on both platforms.

---

## 2. Data Model (Dexie / IndexedDB tables)

> **Why UUIDs (not auto-increment IDs):** every record uses a client-generated `uuid` (`crypto.randomUUID()`) as its primary key, plus `updatedAt` and `deletedAt` (nullable, for soft-deletes) fields. The app is local-only with no sync, but using UUIDs costs nothing now and keeps the door open to adding cloud sync later without a painful data migration. Keep them.

```
exercises        { uuid, name, primaryMuscle, secondaryMuscles[], equipment, category, isCustom, updatedAt, deletedAt }
routines         { uuid, name, exerciseOrder: [exerciseUuid], notes, createdAt, updatedAt, deletedAt }
workouts         { uuid, name, type: 'single'|'routine', routineUuid?, startedAt, endedAt, status, updatedAt, deletedAt }
sets             { uuid, workoutUuid, exerciseUuid, setNumber, weight, reps, rpe?, restSeconds, completedAt, updatedAt, deletedAt }
foods            { uuid, name, brand?, caloriesPer100g, protein, carbs, fat, isCustom, updatedAt, deletedAt }
foodEntries      { uuid, date (YYYY-MM-DD), foodUuid, mealType: 'breakfast'|'lunch'|'dinner'|'snack', grams, updatedAt, deletedAt }
dailyGoals       { uuid, date, calorieGoal, proteinGoal, carbGoal, fatGoal, updatedAt, deletedAt }
settings         { key, value }   // units (kg/lb), default rest time, theme
```

All foreign keys reference `uuid`, not integer ids. Seed `exercises` on first launch with the curated built-in list (see Phase 2); seeded exercises use stable, deterministic UUIDs.

---

## 3. PHASED BUILD PLAN

> Build in this order. Verify each phase runs before moving on.

### ⚙️ Model-usage guide (to conserve Max usage — switch models per phase)

I'm on a Max plan with limited usage to spend, so use the lightest model that does the job for each phase. Before starting each phase, this prompt reminds me what to switch to. Switch with `/model` in Claude Code.

| Phase | Recommended model | Why |
|---|---|---|
| **1 — Scaffold & PWA shell** | **Sonnet** (default effort) | Standard boilerplate, well-trodden. Opus is overkill. |
| **2 — Exercise library (~150) & DB** | **Sonnet** | Mostly seed data + CRUD. Little hard reasoning. |
| **3 — Live workout session + timers** | **Opus, high effort** | Trickiest logic: timers, rest alerts, state. The ONE phase worth the spend. |
| **4 — Routines** | **Sonnet**, escalate to Opus only if stuck | Reuses Phase 3 patterns. Try Sonnet first. |
| **5 — Workout history** | **Sonnet** | List + detail queries. Routine. |
| **6 — Food tracker (manual)** | **Sonnet** | Forms + local data. Routine. |
| **7 — Polish & settings** | **Sonnet** | UI refinement + JSON export/import. |

**Rule of thumb:** run the entire build on **Sonnet** except **Phase 3** (live workout + timers), which is the one place Opus high-effort earns its cost. Escalate elsewhere only if Sonnet gets genuinely stuck after a couple of tries. At the START of each phase, remind me: *"This is Phase N — recommended model: X. Switch now if needed before I continue."* Wait for my confirmation before Phase 3.

---


### PHASE 1 — Project scaffold, PWA shell & interface foundation
- Init Vite + React + TS project.
- Install and configure Tailwind, React Router, Zustand, Dexie, vite-plugin-pwa, **Framer Motion** (minimal use).
- Set up the PWA manifest (name "Fit Tracker", maskable icon, theme color, `display: standalone`, `viewport-fit=cover`) and iOS meta tags (`apple-mobile-web-app-capable`, status-bar style, apple-touch-icon, basic splash). Service worker caches the app shell for offline use.
- **Establish the simple design system and interface basics now** (per section 1b): design tokens, system font stack, safe-area inset handling, light/dark mode, pressed states, and the two shared building blocks — a basic page-transition wrapper and a slide-up bottom sheet. Keep it clean and minimal; reuse everywhere.
- Create the app skeleton: a **bottom tab navigation** (safe-area aware, above the home indicator) with 4 tabs — **Workout**, **Routines**, **Food**, **Profile/Settings**.
- Confirm: app loads, tabs switch with a simple transition, "Add to Home Screen" works and launches full-screen with no browser bar, opens offline.
- ✅ Checkpoint: deployable shell that looks clean and app-like.

### PHASE 2 — Exercise library + database layer
- Define all Dexie tables from section 2.
- Seed a **curated built-in exercise list** on first run — target **~150 exercises** covering the common movements across: Chest, Back (Lats/Traps/Lower back), Shoulders (Front/Side/Rear delts), Biceps, Triceps, Forearms, Legs (Quads/Hamstrings/Glutes/Calves), Core/Abs, and Cardio. Include the main variations per movement (e.g. bench press: barbell flat/incline/decline, dumbbell flat/incline, machine) but don't aim for exhaustive — the custom-exercise feature below covers anything missing.
- Each exercise needs: `name`, `primaryMuscle`, `secondaryMuscles` (array), `equipment` (barbell/dumbbell/machine/cable/bodyweight/kettlebell/band/smith), `category` (strength/cardio).
- Store the seed data in a separate `src/data/exercises.seed.ts` file as a typed array, organized by muscle group. You can adapt names from the open-source **free-exercise-db** (public domain) for accuracy.
- **Create-custom-exercise is a core feature, not optional:** the user can add their own exercise (name, muscle group, equipment) at any time, saved with `isCustom: true`. This is what lets the curated ~150 list stay lean — anything not built-in, the user adds once and it's theirs forever.
- Build the **Exercise Library screen**: searchable + filterable by muscle group and equipment.
- Allow users to **add a custom exercise** (`isCustom: true`).
- ✅ Checkpoint: can browse, search, filter, and add exercises; data persists after reload.

### PHASE 3 — Single workout session (the core feature)
- "Start Single Workout" flow: pick exercises from the library into a session.
- Live session screen:
  - **Global workout timer** (counts up from start, pausable).
  - For each exercise: list of sets. Log **weight, reps**, optional RPE. Mark set complete.
  - **Per-exercise rest timer**: user sets rest duration; on completing a set it starts a countdown that **alerts when finished** (sound + vibration via `navigator.vibrate`, plus on-screen alert). Note clearly in code comments that background/locked-screen firing is limited on iOS — alert fires reliably while app is foregrounded.
  - Add/remove sets per exercise on the fly.
- "Finish workout" → saves the session and all sets, sets `endedAt`.
- ✅ Checkpoint: full single workout can be run start to finish and is saved to history.

### PHASE 4 — Routines
- "Create Routine" screen: name it, add exercises **in a specific order** (drag to reorder), optionally preset target sets/reps.
- "Start Routine" → launches a workout session pre-loaded with the routine's exercises **in order**.
- For each exercise in a routine session, **show the last weight/reps used** for that exercise (query most recent matching sets) so the user knows what to beat.
- Routine sessions use the same live-session UI as Phase 3 (timers, set logging).
- ✅ Checkpoint: create a routine, start it, see last-used weights, log and save.

### PHASE 5 — Workout history
- History screen: list past workouts (date, name, duration, total volume).
- Tap a workout to see all logged sets.
- (Progress charts deferred — not in this build. History list is enough for v1.)
- ✅ Checkpoint: history list works, tapping a workout shows its sets.

### PHASE 6 — Food tracker: manual entry + daily diary
- Daily diary screen organized by meal (breakfast/lunch/dinner/snack), with running calorie + macro totals vs daily goal.
- **Manual food entry** → add a food (name, brand optional, calories + protein/carbs/fat per 100g) saved to `foods` with `isCustom: true`. **Every food entered is saved and reusable** — so the user builds a personal food database; previously-added foods appear in a quick-pick/recent list and are one tap to log again.
- Log a food into a meal by selecting it and entering grams; daily totals update live.
- Date switcher to view/log other days.
- Editable daily goals (calories + macros).
- (No online search and no barcode in this build — manual only. Foods are reusable so repeat entries are fast. Online search can be added later if wanted.)
- ✅ Checkpoint: add a food manually, log it into a meal, re-log a saved food quickly, daily totals update.

### PHASE 7 — Polish & settings (FINAL PHASE)
- Settings: units (kg/lb), default rest time, light/dark theme, **export/import data (JSON backup — this is the backup AND device-transfer mechanism, since data is local-only)**.
- Loading/empty/error states everywhere. Confirm offline behavior. Test timers on a real iPhone and a real Android phone.
- Final PWA audit (Lighthouse): installability, offline, performance.
- ✅ Checkpoint: production-ready PWA.

---

## 4. Build Rules (instructions to the agent)

1. **One phase at a time.** After each phase, run `npm run dev`, verify the checkpoint, and summarize what works before proceeding.
2. **Commit AND push frequently — not just at the end of each phase.** The app is hosted on **Vercel**, which auto-deploys on every push to `main`. I check the live site on my phone and laptop to verify changes, so push after every meaningful chunk of work (e.g. a new screen, a working feature, a significant UI change) — not only at the end of a phase. After each push:
   - First confirm `git config user.name` shows `PipAndrux` (fix if not)
   - `git add -A`
   - `git commit --author="PipAndrux <EMAIL>" -m "short description of what changed"`
   - **Do NOT add any "Co-authored-by" trailer.** The commit message is ONLY the short description.
   - `git push origin main`
   - Tell me it's pushed so I can check the live Vercel deploy on my phone.
   The remote `origin` points to **https://github.com/PipAndrux/GymBro.git**. Authentication via `gh` CLI, logged in as **PipAndrux**. **Never commit as Claude or any other identity.**
3. **Mobile-first CSS always** — design for ~390px width first.
4. **Consistent clean interface, every screen.** Reuse the design tokens, bottom sheet, simple transitions, and pressed states from Phase 1 on every screen. Keep it minimal and uncluttered — don't add elaborate animations or gestures. Clean and functional beats fancy.
5. **Type everything** — no `any` unless unavoidable.
6. **Fully offline by design** — no external APIs anywhere, so everything must work with no network. Nothing should ever block on a fetch.
7. **Comment the known iOS PWA limitation** where relevant (background/locked-screen timers are unreliable on iOS — alerts fire reliably only while the app is foregrounded) so future-me understands the tradeoff.
8. **Don't over-engineer.** This is for a handful of users — favor simple, robust, readable code over abstractions.
9. If a library choice causes trouble on iOS Safari specifically, flag it and propose the alternative before swapping.

---

## 5. Deliverables
- A running PWA, installable on Android + iOS, live on Vercel.
- README with: how to run locally and the known iOS limitations.
- A JSON export/import for data backup.
