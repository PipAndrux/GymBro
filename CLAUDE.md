# GymBro — v3 Feature Roadmap (friends-only now, publish-ready later)

> ## 📌 HOW TO USE THIS FILE
> Save as **`CLAUDE.md`** in the GymBro project folder (replacing the previous one). Claude Code reads it automatically each session.
>
> **Start:** *"Read CLAUDE.md. Start with Feature Phase 1."*
> **Continue:** *"CLAUDE.md — continue with Phase 2."*
> **New session:** *"Read CLAUDE.md. We finished Phase X — continue with Phase Y."*

---

## Where the project is now

The app is a working PWA: dark-themed workout tracker + food diary + body measurements, with Supabase auth and cloud sync. It's live on Vercel and used by me and a few friends.

**This roadmap adds depth and features.** The goal: make GymBro genuinely better and more generous than Hevy, Strong, and Yazio — keep everything those apps charge for FREE here.

## Strategy: free-first, publish-ready

- **Right now: everyone gets everything, unlocked, no paywalls.** It's just me and friends. Do NOT build payment screens or gate any feature yet.
- **But architect for it:** every user profile already has (or gets, in Phase 0 below) a `tier` field (`free` / `pro` / `lifetime`). For now everyone is effectively `lifetime`. This means if I publish later, I flip a flag and the tier system activates — no rebuild needed.
- **What would EVER be paid (later, only if published):** AI features (real per-use cost), progress photo storage (real storage cost), cosmetic themes. Everything else stays free forever.
- **Do not build Stripe / payments / paywalls in this roadmap.** That's a separate future decision. Just keep the architecture tier-aware.

## ZERO-COST GUARANTEE (important)

Everything in this roadmap (Phases 0-5) must cost **€0 to build and run** for me and my friends:
- All features are either local code (runs on the phone) or use the **Supabase free tier** (text data only — tiny).
- **No AI features** in this roadmap (they have real API cost — deferred to FUTURE).
- **Progress photos: UI only, NO actual upload** to Supabase Storage (avoids the 1GB storage limit). See Phase 4b.
- **No external paid APIs.** Open Food Facts (food search) is free with no key.
- If any task would introduce a cost, STOP and tell me first — don't proceed.

---

## RULES (unchanged — always apply)

### GitHub
- Repo: **https://github.com/PipAndrux/GymBro.git** on `main`
- Verify `gh auth status` shows **PipAndrux** before first push of a session
- `git config user.name` = **PipAndrux**, email = PipAndrux GitHub email
- **Never commit as Claude/Anthropic. Never add "Co-authored-by" lines.** Commit messages = short description only.
- Push frequently — Vercel auto-deploys on every push to `main`. Push after each meaningful change so I can check on my phone.

### Build discipline
- **One phase at a time.** Verify each checkpoint before continuing.
- **Mobile-first** (~390px). **Type everything** (no `any`).
- **Offline-first always** — app works fully without internet; Supabase sync is additive, never blocking.
- **Don't over-engineer** — simple, readable code.
- **Consistent design** — reuse the existing dark theme, green accent, design tokens, bottom sheets, and components. Numbers are the hero. Every new screen matches the established look.

### Model usage
- Default **Sonnet, medium effort**. Switch to **Opus, high effort** only for phases marked below or when Sonnet is stuck after 2 tries.
- At the START of each phase, remind me which model to use and wait for confirmation on Opus phases.

---

## PHASE 0 — Tier-ready architecture (quick, do first)
**Model: Sonnet**

Set up the foundation so the app is publish-ready without changing behavior now.

- Ensure the `profiles` table has a `tier` field: `'free' | 'pro' | 'lifetime'`, defaulting to `'lifetime'` for now (so everyone — me and friends — has everything).
- Create a single `useTier()` hook / helper and a `FEATURES` config object that maps features to required tiers. Example: `{ aiCoach: 'pro', progressPhotos: 'pro', everythingElse: 'free' }`.
- Build a `<Gated>` wrapper component that checks tier — but for now it always renders the feature (since everyone is `lifetime`). This is the switch I flip later.
- **Net effect now: nothing is locked.** This phase just puts the plumbing in place invisibly.
- ✅ Checkpoint: app behaves exactly as before; tier field exists; gating helper exists but lets everything through.

---

## PHASE 1 — Workout depth (TOP PRIORITY)
**Model: Sonnet** (Opus only if superset logic gets hairy)

Make logging the best in the category. These are mostly features Hevy/Strong charge for — all free here.

**1a. Plate calculator:**
- Given a target weight and bar weight (default 20kg/45lb), show which plates to load per side. Account for available plate sizes (settings-configurable). Accessible from any weight input during a workout.

**1b. Set types beyond normal:**
- Support **warm-up sets**, **drop sets**, **failure sets**, and **supersets** (two+ exercises grouped, alternating). Mark set type with a small label/color. Supersets share a rest timer flow.

**1c. Warm-up calculator:**
- For a given working weight, suggest warm-up sets (e.g. 40%/60%/80% ramp). Optional, shown when starting an exercise.

**1d. Pre-made program templates:**
- A library of ready-to-use routines users can clone: Push/Pull/Legs, Upper/Lower, Full Body 3x, StrongLifts 5x5, etc. Tapping one copies it into the user's routines so they can customize.

**1e. Exercise detail upgrade:**
- Each exercise gets an info view: primary/secondary muscles (simple muscle highlight diagram or labeled list), and a short text "how to perform." Keep data local (no external API).

- ✅ Checkpoint: plate calculator works, supersets/drop/warm-up sets log correctly, program template library lets you clone a routine, exercise detail shows muscles + instructions.

---

## PHASE 2 — Food features
**Model: Sonnet**

Bring the food side up to Yazio/MyFitnessPal level. (Reverses earlier cuts — barcode + search are now wanted.)

**2a. Online food search:**
- Integrate **Open Food Facts** API (free, no key). Search by name → results with macros → log with grams. Must fail gracefully offline (fall back to local/manual).

**2b. Barcode scanning:**
- Add `@zxing/browser`. Scan a product barcode → Open Food Facts lookup → prefill macros → log. If not found, fall back to manual entry pre-tagged with the barcode. Handle camera-permission denial gracefully.

**2c. Saved meals / meal templates:**
- Let users save a combination of foods as a named meal ("My Breakfast") and log the whole thing in one tap.

**2d. Recipe builder:**
- Combine multiple foods + total servings into a reusable recipe; app calculates per-serving macros. Log a recipe like any food.

**2e. Water tracking:**
- Simple daily water intake counter with a goal, shown on the dashboard. Quick +250ml / +500ml buttons.

- ✅ Checkpoint: can search foods online, scan a barcode, save a meal, build a recipe, track water. All works offline for already-saved items.

---

## PHASE 3 — Social (the Hevy secret weapon)
**Model: Opus, high effort** (relational data, privacy/RLS, feeds)

This is what makes a fitness app sticky. Build carefully — it touches other users' data, so Supabase Row Level Security must be correct.

**3a. Friends system:**
- Users can find friends (by username or a share code) and follow them. Mutual or one-way follow — keep it simple (follow model like Instagram).
- Each user picks a unique **username** and has a public profile (name, avatar, optional stats).

**3b. Activity feed:**
- A feed showing friends' completed workouts (name, date, volume, duration, PRs hit). Tap to see detail.
- Privacy control: each user chooses if workouts are public/friends-only/private. Default friends-only.

**3c. Reactions:**
- Simple likes/reactions on a friend's workout. Keep it lightweight — no comments threads for v1 (avoid moderation complexity).

**3d. Leaderboards (optional, friends only):**
- Among your friends: this week's total volume, longest streak, most workouts. Motivational, not competitive-toxic.

**Security note:** every social table needs strict RLS — users see only public data + their friends' shared data + their own. Get this right; it's the one place a bug leaks private data.

- ✅ Checkpoint: add a friend by code, see their shared workouts in a feed, react to one, view a friends leaderboard. Privacy settings respected. RLS verified (a user cannot read another user's private data).

---

## PHASE 4 — Progress & motivation
**Model: Sonnet** (Opus for any heavy chart/stats work)

**4a. Achievements / badges:**
- Award badges for milestones: first workout, 7/30/100-day streak, first PR, X total workouts, X total volume lifted. Show them on the profile. Satisfying, cheap to build.

**4b. Progress photos (UI only — UPLOAD DISABLED for now):**
- Build the full progress-photos UI: the timeline view, the dated entries layout, the side-by-side compare view. Wire up the data model (a `progressPhotos` table with date, etc.).
- **Do NOT enable actual photo upload to Supabase Storage yet.** I want zero storage cost while building. Instead:
  - The "Add photo" button should be present but show a small "Coming soon" state, OR store the photo only as a local preview in IndexedDB (NOT uploaded to Supabase) — pick whichever is simpler and clearly costs nothing on the server.
  - No images should ever be written to Supabase Storage in this phase.
- **Tier note:** mark progress photos as a `pro` feature in the `FEATURES` config (it WILL use Supabase storage once enabled later) — but it's unlocked for everyone now since all are `lifetime`. When I later decide to turn on real upload, I flip one switch: add client-side compression + the Supabase Storage upload call. The UI is already done.
- ✅ This keeps build cost at exactly €0 — no server storage touched.

**4c. Reports:**
- Weekly and monthly summary screens: workouts done, total volume, top exercises, measurement changes, calories trend. A shareable summary card.

- ✅ Checkpoint: badges unlock on milestones, progress photos UI works (timeline + compare) with NO server upload (zero storage cost), weekly/monthly reports show real data.

---

## PHASE 5 — Polish & quality of life
**Model: Sonnet**

- **Data export:** CSV + JSON export of all workouts/food/measurements (Hevy charges for this — free here).
- **Themes:** a few accent-color choices and light/dark refinement. (Registered as a cosmetic `pro` feature for later, unlocked now.)
- **Onboarding:** a short first-run flow for brand-new users (set units, goals, optional measurements).
- **Notifications:** explore web push for workout reminders / rest-day nudges (note: limited on iOS — document the constraint, don't over-invest).
- **Performance & PWA audit:** Lighthouse pass, ensure offline still solid with all the new features.

- ✅ Checkpoint: export works, themes switch, new users get a clean onboarding, app is fast and offline-capable.

---

## FUTURE (NOT NOW — only if I decide to publish)

These are documented so the architecture stays ready, but **do not build until I explicitly say so:**

- **Activate tiers:** flip default tier from `lifetime` to `free` for new signups; keep friends on `lifetime`. Add a "redeem code" screen so I can give friends free lifetime codes.
- **AI features (the paid tier):** AI workout program generation, "what to eat to hit remaining macros," AI form tips. Real per-use LLM cost → this is what justifies a paid tier. Give free users a small monthly allowance.
- **Payments:** Stripe (web) for a one-time "Supporter / lifetime" unlock (~€5-10) and/or cheap AI subscription. ~3% fees. Only build when there are non-friend users who want to pay.
- **App stores:** package as TWA for Google Play ($25 one-time). iOS stays PWA.

---

## Model usage guide

| Phase | Model | Why |
|---|---|---|
| **0 — Tier architecture** | Sonnet | Config + plumbing |
| **1 — Workout depth** | Sonnet (Opus if supersets get complex) | Mostly UI + logic |
| **2 — Food features** | Sonnet | API integration + forms |
| **3 — Social** | **Opus, high effort** | Relational data, RLS, privacy — must be correct |
| **4 — Progress** | Sonnet (Opus for heavy stats) | Mostly UI + storage |
| **5 — Polish** | Sonnet | QoL fixes |

## Tech stack additions for v3
- **@zxing/browser** — barcode scanning (Phase 2)
- **Open Food Facts API** — food search (Phase 2, free, no key)
- Everything else unchanged (React, Vite, TS, Tailwind, Dexie, Zustand, Supabase, Framer Motion, recharts, lucide-react)

## Design reminder
Dark-first, green accent, bold numbers, generous spacing, consistent with what's already built. Every new feature should feel like it belongs — not bolted on. Match Hevy's polish as the bar.
