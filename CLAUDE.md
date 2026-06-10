Read CLAUDE.md first.
Use Opus model at high effort for all tasks.
This phase touches cross-user data and Supabase RLS — take extra care to get security right.

## FIXES FROM PREVIOUS PHASE (do these first, Sonnet is fine for these two)
1. Friends panel: fix top spacing/padding inside the friends bottom sheet — too much space at the top currently.
2. Add friend view: add a back arrow in the top-left to return to the friends list panel.

## PHASE 3 — Social features
Switch to Opus, high effort for all tasks below.

## TASK 1 — Friend profile view
- Tapping a friend in the friends list opens their Profile page (read-only view).
- Shows: avatar/initials, name, username, and their public stats (total workouts, current streak, PRs).
- Shows their workout history (only workouts marked as friends-only or public — respect privacy setting).
- RLS: a user can only read another user's data if they are mutual friends. Private data stays private.

## TASK 2 — Copy a friend's workout
- On a friend's profile, each workout entry has a "Copy" button.
- Tapping it clones that workout as a new routine in the current user's routines list.
- The copy is fully independent — changes to the copy don't affect the original.
- RLS: user can only copy workouts from friends, and only if the workout is friends-only or public.

## TASK 3 — Compare weights on same exercise
- On a friend's profile, add a "Compare" section or button.
- User picks an exercise → sees a chart overlaying their own progress vs the friend's progress for that exercise (weight over time).
- Use recharts (already in the stack) for the chart.
- Only exercises both users have logged are shown in the picker.
- RLS: same rules — only friends, only non-private data.

## TASK 4 — Privacy settings for workouts
- Each workout should have a privacy setting: Public / Friends only / Private.
- Default: Friends only.
- User can change it from the workout detail view.
- This setting is already referenced in RLS rules above — make sure it's stored on the workout record in Supabase.

## TASK 5 — RLS audit
- Every new or modified Supabase table in this phase must have correct Row Level Security policies.
- A user must never be able to read another user's private data.
- Friendship must be verified server-side (RLS), not just client-side.
- List all RLS policies added in a comment at the top of the relevant migration file.

## General rules
- Mobile-first. No horizontal scroll. 85%+ height bottom sheets where applicable.
- Match existing dark theme, green accent, card style throughout.
- No new paid APIs or storage usage — zero cost.
- Commit after all tasks are complete, as PipAndrux. No Co-authored-by lines.
- Push to main so Vercel deploys.