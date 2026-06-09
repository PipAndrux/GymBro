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

/** Change the global workout privacy and propagate it to all existing shares. */
export async function setWorkoutPrivacy(privacy: WorkoutPrivacy): Promise<void> {
  const me = await uid()
  if (!supabase || !me) return
  const now = Date.now()
  await supabase.from('profiles').update({ workoutPrivacy: privacy, updatedAt: now }).eq('id', me)
  await supabase.from('workout_shares').update({ privacy, updatedAt: now }).eq('userId', me)
  const cached = await getCachedProfile()
  if (cached) await setCachedProfile({ ...cached, workoutPrivacy: privacy, updatedAt: now })
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

/** Upsert a feed summary for a finished workout at the given privacy. */
export async function shareWorkout(summary: WorkoutSummary, privacy: WorkoutPrivacy): Promise<void> {
  const me = await uid()
  if (!supabase || !me) return
  const w = summary.workout
  const topExercises = await topExercisesFor(w.uuid)
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
    prs: summary.prs.map(p => ({ exerciseName: p.exerciseName, weight: p.weight, reps: p.reps, kind: p.kind })),
    privacy,
    deletedAt: null,
    updatedAt: Date.now(),
  }, { onConflict: 'uuid' })
}

/**
 * Share a finished workout IF the user has set up a social profile. Reads the
 * privacy from the local profile cache — works without a profile fetch and
 * never blocks the finish flow. Silent on any failure (offline, etc.).
 */
export async function maybeShareWorkout(summary: WorkoutSummary): Promise<void> {
  try {
    const profile = await getCachedProfile()
    if (!profile) return // no social profile → nothing leaves the device
    await shareWorkout(summary, profile.workoutPrivacy)
  } catch (err) {
    console.warn('[social] share failed', err)
  }
}
