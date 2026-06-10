// ════════════════════════════════════════════════════════════════════════════
// Phase 3 — Social API layer.
//
// Social data is inherently online + cross-user, so (unlike the offline-first
// personal sync engine) these are direct Supabase reads/writes. Every function
// degrades gracefully: with no Supabase client or no network it returns empty /
// no-ops, never throwing into the UI except where the caller wants the message
// (profile creation, adding a friend).
//
// The personal sync engine is untouched — these tables are separate.
// ════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase'
import { db } from '../db'
import type { WorkoutSummary } from './prs'
import type { Exercise, Routine, WorkoutSet, MuscleGroup, Equipment, Category } from '../types'

export type WorkoutPrivacy = 'public' | 'friends' | 'private'

export interface SocialProfile {
  id: string
  username: string
  displayName: string
  shareCode: string       // meaningful only for the signed-in user's own profile
  avatarColor: string
  workoutPrivacy: WorkoutPrivacy
  tier: string
  createdAt: number
  updatedAt: number
}

/** A friend's lightweight public profile (no shareCode). */
export interface FriendProfile {
  id: string
  username: string
  displayName: string
  avatarColor: string
}

export interface Friend {
  friendshipId: string
  profile: FriendProfile
}

export interface TopExercise { name: string; sets: number; volume: number }
export interface SharePR { exerciseName: string; weight: number; reps: number; kind: string }

export interface FeedItem {
  uuid: string
  userId: string
  name: string
  startedAt: number
  durationMs: number
  volume: number
  setCount: number
  exerciseCount: number
  prCount: number
  muscleGroups: string[]
  topExercises: TopExercise[]
  prs: SharePR[]
  author: FriendProfile
  reactionCount: number
  reactedByMe: boolean
}

export interface LeaderboardRow {
  profile: FriendProfile
  isMe: boolean
  volume: number
  workouts: number
  prs: number
  streak: number
}

export interface FriendRequest {
  id: string
  fromProfile: FriendProfile
  createdAt: number
}

/** One denormalized exercise inside a shared workout (sets are the friend's logged
 *  weights/reps). Powers the friend-profile history, copy-as-routine, and compare. */
export interface ShareExercise {
  name: string
  primaryMuscle: string
  equipment?: string
  category?: string
  sets: { weight: number; reps: number }[]
}

/** A friend's shared workout, as seen on their read-only profile. `exercises` is
 *  empty for legacy shares created before set-by-set detail was stored. */
export interface FriendWorkout {
  uuid: string
  name: string
  startedAt: number
  durationMs: number
  volume: number
  setCount: number
  exerciseCount: number
  prCount: number
  muscleGroups: string[]
  topExercises: TopExercise[]
  prs: SharePR[]
  exercises: ShareExercise[]
}

export interface FriendProfileStats {
  totalWorkouts: number
  currentStreak: number
  prs: number
}

export interface FriendProfileData {
  profile: FriendProfile
  /** True only if the viewer and this user are mutual friends (RLS still enforces reads). */
  isFriend: boolean
  stats: FriendProfileStats
  workouts: FriendWorkout[]
}

export const AVATAR_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444']

const PROFILE_CACHE_KEY = 'social_profile'

// ── Local cache of the OWN profile (so finish-share knows privacy offline) ────

export async function getCachedProfile(): Promise<SocialProfile | null> {
  const row = await db.settings.get(PROFILE_CACHE_KEY)
  if (!row || typeof row.value !== 'string') return null
  try { return JSON.parse(row.value) as SocialProfile } catch { return null }
}

async function setCachedProfile(profile: SocialProfile | null): Promise<void> {
  if (profile === null) { await db.settings.delete(PROFILE_CACHE_KEY); return }
  await db.settings.put({ key: PROFILE_CACHE_KEY, value: JSON.stringify(profile) })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomShareCode(): string {
  // Unambiguous base-32 alphabet (no 0/O/1/I) → "GYM-XXXXXX" style codes.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

function pickAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function rowToProfile(r: Record<string, unknown>): SocialProfile {
  return {
    id: String(r.id),
    username: String(r.username ?? ''),
    displayName: String(r.displayName ?? ''),
    shareCode: String(r.shareCode ?? ''),
    avatarColor: String(r.avatarColor ?? AVATAR_COLORS[0]),
    workoutPrivacy: (r.workoutPrivacy as WorkoutPrivacy) ?? 'friends',
    tier: String(r.tier ?? 'lifetime'),
    createdAt: Number(r.createdAt ?? 0),
    updatedAt: Number(r.updatedAt ?? 0),
  }
}

function rowToFriendProfile(r: Record<string, unknown>): FriendProfile {
  return {
    id: String(r.id),
    username: String(r.username ?? ''),
    displayName: String(r.displayName ?? r.username ?? ''),
    avatarColor: String(r.avatarColor ?? AVATAR_COLORS[0]),
  }
}

async function uid(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// ── Profile ─────────────────────────────────────────────────────────────────

/** Fetch the signed-in user's profile from the server, refreshing the local cache. */
export async function fetchMyProfile(): Promise<SocialProfile | null> {
  const me = await uid()
  if (!supabase || !me) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', me).maybeSingle()
  if (error || !data) return null
  const profile = rowToProfile(data as Record<string, unknown>)
  await setCachedProfile(profile)
  return profile
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}

/** Match exercises across users by name (uuids differ per user). */
export function normalizeExerciseName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Create the signed-in user's profile. Throws a friendly message on conflict. */
export async function createProfile(username: string, displayName: string, tier: string): Promise<SocialProfile> {
  const me = await uid()
  if (!supabase || !me) throw new Error('Sign in to use friends.')
  const uname = normalizeUsername(username)
  if (uname.length < 3) throw new Error('Username must be at least 3 characters (letters, numbers, _).')
  const now = Date.now()

  for (let attempt = 0; attempt < 4; attempt++) {
    const profile: SocialProfile = {
      id: me,
      username: uname,
      displayName: displayName.trim() || uname,
      shareCode: randomShareCode(),
      avatarColor: pickAvatarColor(me),
      workoutPrivacy: 'friends',
      tier,
      createdAt: now,
      updatedAt: now,
    }
    const { error } = await supabase.from('profiles').insert(profile)
    if (!error) {
      await setCachedProfile(profile)
      return profile
    }
    // 23505 = unique_violation. Could be username (fatal) or shareCode (retry).
    const msg = error.message.toLowerCase()
    if (error.code === '23505' && msg.includes('username')) throw new Error('That username is taken.')
    if (error.code === '23505') continue // shareCode collision — try a new one
    throw new Error(error.message)
  }
  throw new Error('Could not create profile. Try again.')
}

/** Change the global default workout privacy and propagate it to all existing shares. */
export async function setWorkoutPrivacy(privacy: WorkoutPrivacy): Promise<void> {
  const me = await uid()
  if (!supabase || !me) return
  const now = Date.now()
  await supabase.from('profiles').update({ workoutPrivacy: privacy, updatedAt: now }).eq('id', me)
  await supabase.from('workout_shares').update({ privacy, updatedAt: now }).eq('userId', me)
  const cached = await getCachedProfile()
  if (cached) await setCachedProfile({ ...cached, workoutPrivacy: privacy, updatedAt: now })
}

/**
 * Set the privacy of ONE shared workout (per-workout override, Phase 3 Task 4).
 * Updates only the matching share row for the signed-in user — RLS (shares_modify)
 * guarantees no other user's row can be touched. No-op if the workout was never
 * shared (e.g. finished before a social profile existed).
 */
export async function setWorkoutSharePrivacy(workoutUuid: string, privacy: WorkoutPrivacy): Promise<void> {
  const me = await uid()
  if (!supabase || !me) return
  await supabase
    .from('workout_shares')
    .update({ privacy, updatedAt: Date.now() })
    .eq('uuid', workoutUuid)
    .eq('userId', me)
}

// ── Friends ─────────────────────────────────────────────────────────────────

export async function searchProfiles(query: string): Promise<FriendProfile[]> {
  const me = await uid()
  if (!supabase || !me) return []
  const q = normalizeUsername(query)
  if (!q) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, displayName, avatarColor')
    .ilike('username', `${q}%`)
    .neq('id', me)
    .limit(15)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToFriendProfile)
}

/** Add a friend by their share code. Returns the new friend's profile. */
export async function addFriendByCode(code: string): Promise<FriendProfile> {
  if (!supabase) throw new Error('Cloud sync is not configured.')
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean) throw new Error('Enter a friend code.')
  const { data, error } = await supabase.rpc('add_friend_by_code', { code: clean })
  if (error) throw new Error(error.message)
  return rowToFriendProfile(data as Record<string, unknown>)
}

export async function addFriendById(targetId: string): Promise<void> {
  if (!supabase) throw new Error('Cloud sync is not configured.')
  const { error } = await supabase.rpc('add_friend', { target: targetId })
  if (error) throw new Error(error.message)
}

export async function getFriends(): Promise<Friend[]> {
  const me = await uid()
  if (!supabase || !me) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_a, user_b')
    .or(`user_a.eq.${me},user_b.eq.${me}`)
  if (error || !data) return []
  const rows = data as { id: string; user_a: string; user_b: string }[]
  const otherIdByFriendship = new Map<string, string>()
  for (const r of rows) otherIdByFriendship.set(r.id, r.user_a === me ? r.user_b : r.user_a)
  const otherIds = [...new Set([...otherIdByFriendship.values()])]
  if (otherIds.length === 0) return []
  const { data: profs } = await supabase
    .from('profiles').select('id, username, displayName, avatarColor').in('id', otherIds)
  const profMap = new Map<string, FriendProfile>()
  for (const p of (profs ?? []) as Record<string, unknown>[]) {
    const fp = rowToFriendProfile(p); profMap.set(fp.id, fp)
  }
  const friends: Friend[] = []
  for (const [friendshipId, otherId] of otherIdByFriendship) {
    const profile = profMap.get(otherId)
    if (profile) friends.push({ friendshipId, profile })
  }
  return friends.sort((a, b) => a.profile.username.localeCompare(b.profile.username))
}

export async function removeFriend(friendshipId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('friendships').delete().eq('id', friendshipId)
}

/** Fetch pending incoming friend requests for the signed-in user. */
export async function getPendingRequests(): Promise<FriendRequest[]> {
  const me = await uid()
  if (!supabase || !me) return []
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('id, from_user, created_at')
      .eq('to_user', me)
      .is('accepted_at', null)
      .is('declined_at', null)
    if (error || !data) return []
    const rows = data as { id: string; from_user: string; created_at: number }[]
    if (rows.length === 0) return []
    const fromIds = rows.map(r => r.from_user)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, displayName, avatarColor')
      .in('id', fromIds)
    const profMap = new Map<string, FriendProfile>()
    for (const p of (profs ?? []) as Record<string, unknown>[]) {
      const fp = rowToFriendProfile(p)
      profMap.set(fp.id, fp)
    }
    return rows.map(r => ({
      id: r.id,
      fromProfile: profMap.get(r.from_user) ?? {
        id: r.from_user, username: 'unknown', displayName: 'Unknown', avatarColor: AVATAR_COLORS[0],
      },
      createdAt: r.created_at,
    }))
  } catch {
    return []
  }
}

export async function acceptRequest(requestId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId })
  if (error) throw new Error(error.message)
}

export async function declineRequest(requestId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('friend_requests').update({ declined_at: Date.now() }).eq('id', requestId)
}

// ── Activity feed ─────────────────────────────────────────────────────────────

interface ShareRow {
  uuid: string; userId: string; name: string; startedAt: number; durationMs: number
  volume: number; setCount: number; exerciseCount: number; prCount: number
  muscleGroups: string[] | null; topExercises: TopExercise[] | null; prs: SharePR[] | null
}

export async function getFeed(): Promise<FeedItem[]> {
  const me = await uid()
  if (!supabase || !me) return []
  const friends = await getFriends()
  if (friends.length === 0) return []
  const friendIds = friends.map(f => f.profile.id)
  const authorMap = new Map(friends.map(f => [f.profile.id, f.profile]))

  const { data, error } = await supabase
    .from('workout_shares')
    .select('uuid, userId, name, startedAt, durationMs, volume, setCount, exerciseCount, prCount, muscleGroups, topExercises, prs')
    .in('userId', friendIds)
    .is('deletedAt', null)
    .order('startedAt', { ascending: false })
    .limit(60)
  if (error || !data) return []
  const shares = data as unknown as ShareRow[]
  if (shares.length === 0) return []

  // Reaction counts + whether I reacted, in one query.
  const shareUuids = shares.map(s => s.uuid)
  const { data: reactionRows } = await supabase
    .from('reactions').select('shareUuid, userId').in('shareUuid', shareUuids)
  const countByShare = new Map<string, number>()
  const mineByShare = new Set<string>()
  for (const r of (reactionRows ?? []) as { shareUuid: string; userId: string }[]) {
    countByShare.set(r.shareUuid, (countByShare.get(r.shareUuid) ?? 0) + 1)
    if (r.userId === me) mineByShare.add(r.shareUuid)
  }

  return shares.map(s => ({
    uuid: s.uuid,
    userId: s.userId,
    name: s.name,
    startedAt: s.startedAt,
    durationMs: s.durationMs,
    volume: s.volume,
    setCount: s.setCount,
    exerciseCount: s.exerciseCount,
    prCount: s.prCount,
    muscleGroups: s.muscleGroups ?? [],
    topExercises: s.topExercises ?? [],
    prs: s.prs ?? [],
    author: authorMap.get(s.userId) ?? { id: s.userId, username: 'friend', displayName: 'Friend', avatarColor: AVATAR_COLORS[0] },
    reactionCount: countByShare.get(s.uuid) ?? 0,
    reactedByMe: mineByShare.has(s.uuid),
  }))
}

/** Toggle my reaction on a share. Returns the new reacted state. */
export async function toggleReaction(shareUuid: string, reacted: boolean): Promise<boolean> {
  const me = await uid()
  if (!supabase || !me) return reacted
  if (reacted) {
    await supabase.from('reactions').delete().eq('shareUuid', shareUuid).eq('userId', me)
    return false
  }
  await supabase.from('reactions').upsert(
    { shareUuid, userId: me, emoji: '💪', createdAt: Date.now() },
    { onConflict: 'shareUuid,userId' },
  )
  return true
}

// ── Leaderboard (friends + me, current week) ──────────────────────────────────

export async function getLeaderboard(weekStartMs: number): Promise<LeaderboardRow[]> {
  const me = await uid()
  if (!supabase || !me) return []
  const friends = await getFriends()
  const myProfile = await getCachedProfile()
  const ids = [me, ...friends.map(f => f.profile.id)]

  const { data, error } = await supabase
    .from('workout_shares')
    .select('userId, volume, startedAt, prCount')
    .in('userId', ids)
    .gte('startedAt', weekStartMs)
    .is('deletedAt', null)
  if (error || !data) return []
  const rows = data as { userId: string; volume: number; startedAt: number; prCount: number }[]

  interface Agg { volume: number; workouts: number; prs: number; days: Set<string> }
  const agg = new Map<string, Agg>()
  for (const r of rows) {
    const a = agg.get(r.userId) ?? { volume: 0, workouts: 0, prs: 0, days: new Set<string>() }
    a.volume += r.volume || 0
    a.workouts += 1
    a.prs += r.prCount || 0
    a.days.add(new Date(r.startedAt).toISOString().slice(0, 10))
    agg.set(r.userId, a)
  }

  const profileFor = (id: string): FriendProfile => {
    if (id === me) {
      return myProfile
        ? { id: me, username: myProfile.username, displayName: myProfile.displayName, avatarColor: myProfile.avatarColor }
        : { id: me, username: 'you', displayName: 'You', avatarColor: AVATAR_COLORS[0] }
    }
    const f = friends.find(x => x.profile.id === id)
    return f?.profile ?? { id, username: 'friend', displayName: 'Friend', avatarColor: AVATAR_COLORS[0] }
  }

  const out: LeaderboardRow[] = []
  for (const [id, a] of agg) {
    out.push({ profile: profileFor(id), isMe: id === me, volume: Math.round(a.volume), workouts: a.workouts, prs: a.prs, streak: a.days.size })
  }
  return out
}

// ── Sharing a finished workout ────────────────────────────────────────────────

async function topExercisesFor(workoutUuid: string, limit = 3): Promise<TopExercise[]> {
  const sets = await db.sets.where('workoutUuid').equals(workoutUuid).filter(s => s.deletedAt === null).toArray()
  const byEx = new Map<string, { volume: number; sets: number }>()
  for (const s of sets) {
    const cur = byEx.get(s.exerciseUuid) ?? { volume: 0, sets: 0 }
    cur.volume += (s.weight || 0) * (s.reps || 0)
    cur.sets += 1
    byEx.set(s.exerciseUuid, cur)
  }
  const ids = [...byEx.keys()]
  const exs = await db.exercises.bulkGet(ids)
  const named = ids.map((id, i) => ({
    name: exs[i]?.name ?? 'Exercise',
    volume: Math.round(byEx.get(id)!.volume),
    sets: byEx.get(id)!.sets,
  }))
  return named.sort((a, b) => b.volume - a.volume).slice(0, limit)
}

/**
 * Full denormalized exercise/set breakdown of a finished workout (in logged order).
 * This is the per-workout payload friends use to copy the routine and compare lifts.
 * It only ever contains the owner's own local sets and is published at the workout's
 * chosen privacy — the raw private `sets` table is never read cross-user.
 */
async function exercisesFor(workoutUuid: string): Promise<ShareExercise[]> {
  const sets = await db.sets.where('workoutUuid').equals(workoutUuid).filter(s => s.deletedAt === null).toArray()
  if (sets.length === 0) return []
  sets.sort((a, b) => a.setNumber - b.setNumber)

  const order: string[] = []
  const byEx = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    const arr = byEx.get(s.exerciseUuid)
    if (arr) arr.push(s)
    else { byEx.set(s.exerciseUuid, [s]); order.push(s.exerciseUuid) }
  }
  const exs = await db.exercises.bulkGet(order)
  return order.map((id, i) => {
    const ex = exs[i]
    return {
      name: ex?.name ?? 'Exercise',
      primaryMuscle: ex?.primaryMuscle ?? 'chest',
      equipment: ex?.equipment,
      category: ex?.category,
      sets: byEx.get(id)!.map(s => ({ weight: s.weight || 0, reps: s.reps || 0 })),
    }
  })
}

/** Upsert a feed summary (plus full exercise detail) for a finished workout. */
export async function shareWorkout(summary: WorkoutSummary, privacy: WorkoutPrivacy): Promise<void> {
  const me = await uid()
  if (!supabase || !me) return
  const w = summary.workout
  const [topExercises, exercises] = await Promise.all([topExercisesFor(w.uuid), exercisesFor(w.uuid)])
  await supabase.from('workout_shares').upsert({
    uuid: w.uuid,
    userId: me,
    name: w.name,
    startedAt: w.startedAt,
    durationMs: summary.durationMs,
    volume: Math.round(summary.volume),
    setCount: summary.setCount,
    exerciseCount: summary.exerciseCount,
    prCount: summary.prs.length,
    muscleGroups: summary.muscleGroups,
    topExercises,
    exercises,
    prs: summary.prs.map(p => ({ exerciseName: p.exerciseName, weight: p.weight, reps: p.reps, kind: p.kind })),
    privacy,
    deletedAt: null,
    updatedAt: Date.now(),
  }, { onConflict: 'uuid' })
}

/**
 * Share a finished workout IF the user has set up a social profile. Uses the
 * workout's own privacy when set (Phase 3 Task 4), falling back to the profile
 * default. Reads from the local cache — works offline and never blocks finish.
 */
export async function maybeShareWorkout(summary: WorkoutSummary): Promise<void> {
  try {
    const profile = await getCachedProfile()
    if (!profile) return // no social profile → nothing leaves the device
    await shareWorkout(summary, summary.workout.privacy ?? profile.workoutPrivacy)
  } catch (err) {
    console.warn('[social] share failed', err)
  }
}

/**
 * Enrich the signed-in user's already-shared workouts that predate set-by-set
 * detail. Only fills in the `exercises` column on rows where it is null — it never
 * shares a new workout or changes any privacy. Idempotent and best-effort, so the
 * copy/compare features work on history that was shared before this release.
 */
export async function backfillShareDetails(): Promise<void> {
  try {
    const me = await uid()
    if (!supabase || !me) return
    const { data, error } = await supabase
      .from('workout_shares')
      .select('uuid')
      .eq('userId', me)
      .is('exercises', null)
      .limit(50)
    if (error || !data || data.length === 0) return
    for (const row of data as { uuid: string }[]) {
      const exercises = await exercisesFor(row.uuid)
      if (exercises.length === 0) continue
      await supabase
        .from('workout_shares')
        .update({ exercises, updatedAt: Date.now() })
        .eq('uuid', row.uuid)
        .eq('userId', me)
    }
  } catch (err) {
    console.warn('[social] backfill failed', err)
  }
}

// ── Friend profile (read-only) + copy + compare ───────────────────────────────

interface FriendShareRow {
  uuid: string; userId: string; name: string; startedAt: number; durationMs: number
  volume: number; setCount: number; exerciseCount: number; prCount: number
  muscleGroups: string[] | null; topExercises: TopExercise[] | null
  prs: SharePR[] | null; exercises: ShareExercise[] | null
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Current consecutive-day workout streak from a friend's visible shares. */
function streakFromDates(timestamps: number[]): number {
  if (timestamps.length === 0) return 0
  const days = [...new Set(timestamps.map(dayKey))].sort()
  const today = dayKey(Date.now())
  const yesterday = dayKey(Date.now() - 86_400_000)
  const last = days[days.length - 1]
  if (last !== today && last !== yesterday) return 0
  let streak = 1
  for (let i = days.length - 2; i >= 0; i--) {
    const a = new Date(days[i] + 'T12:00:00').getTime()
    const b = new Date(days[i + 1] + 'T12:00:00').getTime()
    if (Math.round((b - a) / 86_400_000) === 1) streak++
    else break
  }
  return streak
}

/**
 * Read-only profile data for a friend (Phase 3 Task 1). Returns their public
 * profile, mutual-friend status, derived stats, and the workouts they've shared.
 * Privacy is enforced by RLS: the shares query only returns rows this viewer is
 * allowed to see (public, or friends-only when a friendship exists). Private
 * workouts are never returned.
 */
export async function getFriendProfileData(friendId: string): Promise<FriendProfileData | null> {
  const me = await uid()
  if (!supabase || !me) return null

  const { data: prof } = await supabase
    .from('profiles').select('id, username, displayName, avatarColor').eq('id', friendId).maybeSingle()
  if (!prof) return null
  const profile = rowToFriendProfile(prof as Record<string, unknown>)

  const friends = await getFriends()
  const isFriend = friends.some(f => f.profile.id === friendId)

  const { data, error } = await supabase
    .from('workout_shares')
    .select('uuid, userId, name, startedAt, durationMs, volume, setCount, exerciseCount, prCount, muscleGroups, topExercises, prs, exercises')
    .eq('userId', friendId)
    .is('deletedAt', null)
    .order('startedAt', { ascending: false })
    .limit(100)

  const rows = (error || !data ? [] : (data as unknown as FriendShareRow[]))
  const workouts: FriendWorkout[] = rows.map(s => ({
    uuid: s.uuid,
    name: s.name,
    startedAt: s.startedAt,
    durationMs: s.durationMs,
    volume: s.volume,
    setCount: s.setCount,
    exerciseCount: s.exerciseCount,
    prCount: s.prCount,
    muscleGroups: s.muscleGroups ?? [],
    topExercises: s.topExercises ?? [],
    prs: s.prs ?? [],
    exercises: s.exercises ?? [],
  }))

  const stats: FriendProfileStats = {
    totalWorkouts: workouts.length,
    currentStreak: streakFromDates(workouts.map(w => w.startedAt)),
    prs: workouts.reduce((sum, w) => sum + (w.prCount || 0), 0),
  }

  return { profile, isFriend, stats, workouts }
}

const VALID_MUSCLES = new Set<MuscleGroup>([
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core', 'cardio',
])
const VALID_EQUIPMENT = new Set<Equipment>([
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'smith',
])

/** Find a local exercise by name, or create a faithful custom copy of a shared one. */
async function findOrCreateExercise(src: ShareExercise): Promise<string> {
  const target = normalizeExerciseName(src.name)
  const candidates = await db.exercises.where('name').equalsIgnoreCase(src.name).toArray()
  const match = candidates.find(e => e.deletedAt === null && normalizeExerciseName(e.name) === target)
  if (match) return match.uuid

  const primaryMuscle = VALID_MUSCLES.has(src.primaryMuscle as MuscleGroup) ? (src.primaryMuscle as MuscleGroup) : 'chest'
  const equipment = VALID_EQUIPMENT.has(src.equipment as Equipment) ? (src.equipment as Equipment) : 'barbell'
  const category: Category = src.category === 'cardio' ? 'cardio' : 'strength'
  const now = Date.now()
  const exercise: Exercise = {
    uuid: crypto.randomUUID(),
    name: src.name.trim() || 'Exercise',
    primaryMuscle,
    secondaryMuscles: [],
    equipment,
    category,
    isCustom: true,
    updatedAt: now,
    deletedAt: null,
  }
  await db.exercises.add(exercise)
  return exercise.uuid
}

/**
 * Clone a friend's shared workout into the signed-in user's own routines list
 * (Phase 3 Task 2). The copy is fully independent: new local exercise records are
 * created for any the user doesn't already have, and a brand-new routine is saved.
 * Falls back to the top-exercise names when a legacy share has no `exercises`.
 */
export async function copyFriendWorkoutToRoutine(workout: FriendWorkout, fromUsername: string): Promise<Routine> {
  const source: ShareExercise[] = workout.exercises.length > 0
    ? workout.exercises
    : workout.topExercises.map(t => ({ name: t.name, primaryMuscle: 'chest', sets: [] }))
  if (source.length === 0) throw new Error('This workout has no exercises to copy.')

  // De-dupe by normalized name, preserving order.
  const seen = new Set<string>()
  const exerciseOrder: string[] = []
  for (const ex of source) {
    const key = normalizeExerciseName(ex.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    exerciseOrder.push(await findOrCreateExercise(ex))
  }
  if (exerciseOrder.length === 0) throw new Error('This workout has no exercises to copy.')

  const now = Date.now()
  const routine: Routine = {
    uuid: crypto.randomUUID(),
    name: workout.name?.trim() || 'Copied workout',
    exerciseOrder,
    notes: `Copied from @${fromUsername}`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.routines.add(routine)
  return routine
}
