import { db } from '../db'
import type { WorkoutSet, Workout, MuscleGroup } from '../types'

// ─── Estimated 1-rep max (Epley) ────────────────────────────────────────────
//
// e1RM = weight × (1 + reps/30). This collapses any (weight, reps) lift into a
// single comparable "strength" scalar, so progress can be tracked on one axis
// even as set/rep schemes change. PRs are *derived* from the sets table (never
// stored separately) — sets are the single source of truth, so editing or
// deleting a set retroactively corrects every record with zero bookkeeping.

export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return weight * (1 + reps / 30)
}

export function roundN(v: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

const EPS = 1e-6

/** A set that counts toward strength records: live, completed, real numbers. */
function isScoringSet(s: WorkoutSet): boolean {
  return s.deletedAt === null && s.completedAt != null && s.weight > 0 && s.reps > 0
}

// ─── Live PR detection (during a session) ────────────────────────────────────

export interface PRFlags {
  /** New best estimated 1RM for this exercise (the headline "got stronger" signal). */
  e1rm: boolean
  /** New heaviest weight at this exact rep count. */
  weight: boolean
}

export const NO_PR: PRFlags = { e1rm: false, weight: false }
export const hasPR = (f: PRFlags | undefined): boolean => !!f && (f.e1rm || f.weight)

/**
 * Does this just-completed set beat everything that came before it for the same
 * exercise? Compares against all prior scoring sets (across every workout,
 * including earlier sets in the current one). The very first completed set for
 * an exercise counts as an e1RM PR — your first record is worth celebrating.
 */
export async function detectSetPR(target: WorkoutSet): Promise<PRFlags> {
  if (!isScoringSet(target) || target.completedAt == null) return NO_PR
  const targetCompletedAt = target.completedAt

  const prior = (await db.sets.where('exerciseUuid').equals(target.exerciseUuid).toArray()).filter(
    s => s.uuid !== target.uuid && isScoringSet(s) && (s.completedAt as number) < targetCompletedAt
  )

  const targetE1 = estimate1RM(target.weight, target.reps)
  let bestE1 = 0
  let bestWeightAtReps = 0
  let hasPriorAtReps = false
  for (const s of prior) {
    const e = estimate1RM(s.weight, s.reps)
    if (e > bestE1) bestE1 = e
    if (s.reps === target.reps) {
      hasPriorAtReps = true
      if (s.weight > bestWeightAtReps) bestWeightAtReps = s.weight
    }
  }

  return {
    e1rm: targetE1 > bestE1 + EPS, // first-ever set: bestE1 = 0 → true
    weight: hasPriorAtReps && target.weight > bestWeightAtReps + EPS,
  }
}

// ─── Recent PRs (dashboard celebratory card) ─────────────────────────────────

export interface RecentPR {
  exerciseUuid: string
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
  date: number
}

/**
 * Walks all scoring sets chronologically, emitting an event each time an
 * exercise's all-time e1RM rises. Returns the most recent few within `days`.
 */
export async function getRecentPRs(days = 21, limit = 3): Promise<RecentPR[]> {
  const sets = (await db.sets.toArray()).filter(isScoringSet)
  sets.sort((a, b) => (a.completedAt as number) - (b.completedAt as number))

  const best = new Map<string, number>()
  const events: Omit<RecentPR, 'exerciseName'>[] = []
  for (const s of sets) {
    const e = estimate1RM(s.weight, s.reps)
    const prev = best.get(s.exerciseUuid) ?? 0
    if (e > prev + EPS) {
      best.set(s.exerciseUuid, e)
      events.push({ exerciseUuid: s.exerciseUuid, weight: s.weight, reps: s.reps, e1rm: e, date: s.completedAt as number })
    }
  }

  const cutoff = Date.now() - days * 86_400_000
  const recent = events.filter(e => e.date >= cutoff).sort((a, b) => b.date - a.date).slice(0, limit)

  const names = await Promise.all(recent.map(e => db.exercises.get(e.exerciseUuid)))
  return recent.map((e, i) => ({ ...e, exerciseName: names[i]?.name ?? 'Exercise' }))
}

// ─── Per-exercise progress series (charts) ───────────────────────────────────

export interface E1RMPoint {
  date: number
  e1rm: number
  bestWeight: number
  reps: number
}

/** One point per workout: that workout's best e1RM for the exercise, by date. */
export async function getExerciseE1RMSeries(exerciseUuid: string): Promise<E1RMPoint[]> {
  const sets = (await db.sets.where('exerciseUuid').equals(exerciseUuid).toArray()).filter(isScoringSet)
  if (sets.length === 0) return []

  // workoutUuid → best scoring set (by e1RM) in that workout
  const bestPerWorkout = new Map<string, { e1rm: number; weight: number; reps: number }>()
  for (const s of sets) {
    const e = estimate1RM(s.weight, s.reps)
    const cur = bestPerWorkout.get(s.workoutUuid)
    if (!cur || e > cur.e1rm) bestPerWorkout.set(s.workoutUuid, { e1rm: e, weight: s.weight, reps: s.reps })
  }

  const workoutUuids = [...bestPerWorkout.keys()]
  const workouts = await db.workouts.bulkGet(workoutUuids)
  const points: E1RMPoint[] = []
  workoutUuids.forEach((uuid, i) => {
    const w = workouts[i]
    if (!w || w.deletedAt !== null) return
    const b = bestPerWorkout.get(uuid)!
    points.push({ date: w.startedAt, e1rm: roundN(b.e1rm), bestWeight: b.weight, reps: b.reps })
  })
  points.sort((a, b) => a.date - b.date)
  return points
}

export interface RepMax {
  reps: number
  weight: number
  e1rm: number
  date: number
}

/** Heaviest weight ever lifted at each rep count (the classic rep-max table). */
export async function getExerciseRepMaxes(exerciseUuid: string): Promise<RepMax[]> {
  const sets = (await db.sets.where('exerciseUuid').equals(exerciseUuid).toArray()).filter(isScoringSet)
  const byReps = new Map<number, { weight: number; date: number }>()
  for (const s of sets) {
    const cur = byReps.get(s.reps)
    if (!cur || s.weight > cur.weight) byReps.set(s.reps, { weight: s.weight, date: s.completedAt as number })
  }
  return [...byReps.entries()]
    .map(([reps, v]) => ({ reps, weight: v.weight, e1rm: roundN(estimate1RM(v.weight, reps)), date: v.date }))
    .sort((a, b) => a.reps - b.reps)
}

// ─── Weekly volume (bar chart) ───────────────────────────────────────────────

function mondayKey(ts: number): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface WeeklyVolumePoint {
  weekStart: string
  label: string
  volume: number
}

/** Total volume (Σ weight × reps) per week for the last `weeks`, oldest first. */
export async function getWeeklyVolume(weeks = 10): Promise<WeeklyVolumePoint[]> {
  const finished = await db.workouts.filter(w => w.status === 'finished' && w.deletedAt === null).toArray()
  const volByWeek = new Map<string, number>()
  for (const w of finished) {
    const sets = await db.sets.where('workoutUuid').equals(w.uuid).filter(s => s.deletedAt === null).toArray()
    const vol = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
    if (vol <= 0) continue
    const key = mondayKey(w.startedAt)
    volByWeek.set(key, (volByWeek.get(key) ?? 0) + vol)
  }

  // Build a continuous run of the last `weeks` Mondays (including empty weeks).
  const now = new Date()
  const points: WeeklyVolumePoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = mondayKey(d.getTime())
    const label = new Date(key + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    points.push({ weekStart: key, label, volume: Math.round(volByWeek.get(key) ?? 0) })
  }
  return points
}

// ─── Exercises that have data (progress overview list) ───────────────────────

export interface ExerciseWithData {
  exerciseUuid: string
  name: string
  primaryMuscle: MuscleGroup
  bestE1RM: number
  bestWeight: number
  bestReps: number
  lastDate: number
  sessions: number
}

export async function getExercisesWithData(): Promise<ExerciseWithData[]> {
  const sets = (await db.sets.toArray()).filter(isScoringSet)
  if (sets.length === 0) return []

  interface Agg { bestE1RM: number; bestWeight: number; bestReps: number; lastDate: number; workouts: Set<string> }
  const agg = new Map<string, Agg>()
  for (const s of sets) {
    const e = estimate1RM(s.weight, s.reps)
    const a = agg.get(s.exerciseUuid)
    if (!a) {
      agg.set(s.exerciseUuid, {
        bestE1RM: e, bestWeight: s.weight, bestReps: s.reps,
        lastDate: s.completedAt as number, workouts: new Set([s.workoutUuid]),
      })
    } else {
      if (e > a.bestE1RM) { a.bestE1RM = e; a.bestWeight = s.weight; a.bestReps = s.reps }
      if ((s.completedAt as number) > a.lastDate) a.lastDate = s.completedAt as number
      a.workouts.add(s.workoutUuid)
    }
  }

  const uuids = [...agg.keys()]
  const exercises = await db.exercises.bulkGet(uuids)
  const out: ExerciseWithData[] = []
  uuids.forEach((uuid, i) => {
    const ex = exercises[i]
    if (!ex) return
    const a = agg.get(uuid)!
    out.push({
      exerciseUuid: uuid,
      name: ex.name,
      primaryMuscle: ex.primaryMuscle,
      bestE1RM: roundN(a.bestE1RM),
      bestWeight: a.bestWeight,
      bestReps: a.bestReps,
      lastDate: a.lastDate,
      sessions: a.workouts.size,
    })
  })
  return out.sort((a, b) => b.lastDate - a.lastDate)
}

// ─── Workout summary (finish screen) ─────────────────────────────────────────

export interface SummaryPR {
  exerciseUuid: string
  exerciseName: string
  weight: number
  reps: number
  e1rm: number
  kind: 'e1rm' | 'weight'
}

export interface WorkoutSummary {
  workout: Workout
  durationMs: number
  volume: number
  setCount: number
  exerciseCount: number
  muscleGroups: MuscleGroup[]
  prs: SummaryPR[]
}

/**
 * Authoritative summary for a finished workout, computed from saved data.
 * PRs are judged against every *other* workout that ended earlier, then the
 * within-session progression is replayed so the best lift of the day wins.
 */
export async function getWorkoutSummary(workoutUuid: string): Promise<WorkoutSummary | null> {
  const workout = await db.workouts.get(workoutUuid)
  if (!workout) return null

  const allSets = await db.sets.where('workoutUuid').equals(workoutUuid).filter(s => s.deletedAt === null).toArray()
  const completed = allSets.filter(isScoringSet).sort((a, b) => (a.completedAt as number) - (b.completedAt as number))

  const volume = allSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
  const exerciseUuids = [...new Set(allSets.map(s => s.exerciseUuid))]
  const exercises = await db.exercises.bulkGet(exerciseUuids)
  const exMap = new Map(exerciseUuids.map((u, i) => [u, exercises[i]]))

  const muscleGroups = [...new Set(
    exerciseUuids.map(u => exMap.get(u)?.primaryMuscle).filter((m): m is MuscleGroup => !!m)
  )]

  // Prior bests from every other workout that finished before this one.
  const endBound = workout.endedAt ?? Number.MAX_SAFE_INTEGER
  const priorSets = (await db.sets.toArray()).filter(
    s => isScoringSet(s) && s.workoutUuid !== workoutUuid && (s.completedAt as number) < endBound
  )
  const priorE1 = new Map<string, number>()
  const priorWeightAtReps = new Map<string, number>() // key: `${exUuid}|${reps}`
  for (const s of priorSets) {
    const e = estimate1RM(s.weight, s.reps)
    if (e > (priorE1.get(s.exerciseUuid) ?? 0)) priorE1.set(s.exerciseUuid, e)
    const k = `${s.exerciseUuid}|${s.reps}`
    if (s.weight > (priorWeightAtReps.get(k) ?? 0)) priorWeightAtReps.set(k, s.weight)
  }

  // Replay this session in completion order; record the moments a record falls.
  const runE1 = new Map(priorE1)
  const runWeight = new Map(priorWeightAtReps)
  const e1Winner = new Map<string, SummaryPR>()      // one headline e1RM PR per exercise
  const weightWinners = new Map<string, SummaryPR>() // best weight PR per (exercise|reps)
  for (const s of completed) {
    const name = exMap.get(s.exerciseUuid)?.name ?? 'Exercise'
    const e = estimate1RM(s.weight, s.reps)
    if (e > (runE1.get(s.exerciseUuid) ?? 0) + EPS) {
      runE1.set(s.exerciseUuid, e)
      e1Winner.set(s.exerciseUuid, {
        exerciseUuid: s.exerciseUuid, exerciseName: name, weight: s.weight, reps: s.reps, e1rm: roundN(e), kind: 'e1rm',
      })
    }
    const k = `${s.exerciseUuid}|${s.reps}`
    const hadPrior = priorWeightAtReps.has(k)
    if (hadPrior && s.weight > (runWeight.get(k) ?? 0) + EPS) {
      runWeight.set(k, s.weight)
      weightWinners.set(k, {
        exerciseUuid: s.exerciseUuid, exerciseName: name, weight: s.weight, reps: s.reps, e1rm: roundN(e), kind: 'weight',
      })
    } else if (s.weight > (runWeight.get(k) ?? 0)) {
      runWeight.set(k, s.weight)
    }
  }

  // Merge, dropping weight PRs already covered by an exercise's headline e1RM PR.
  const prs: SummaryPR[] = [...e1Winner.values()]
  for (const wpr of weightWinners.values()) {
    const headline = e1Winner.get(wpr.exerciseUuid)
    if (headline && headline.weight === wpr.weight && headline.reps === wpr.reps) continue
    prs.push(wpr)
  }
  prs.sort((a, b) => b.e1rm - a.e1rm)

  return {
    workout,
    durationMs: (workout.endedAt ?? workout.startedAt) - workout.startedAt,
    volume,
    setCount: completed.length,
    exerciseCount: exerciseUuids.length,
    muscleGroups,
    prs,
  }
}
