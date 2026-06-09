import { create } from 'zustand'
import { db } from '../db'
import type { Exercise, Workout, WorkoutSet, Routine } from '../types'
import { getSetting, DEFAULT_SETTINGS } from '../lib/settings'
import { detectSetPR, hasPR, type PRFlags } from '../lib/prs'
import { playFanfare, vibrate } from '../lib/feedback'

export const DEFAULT_REST = DEFAULT_SETTINGS.defaultRestSeconds
const ORDER_KEY = 'active_session_order'

export interface SessionExercise {
  exercise: Exercise
  restSeconds: number
  supersetGroup?: string
}

export interface RestTimer {
  exerciseUuid: string
  startedAt: number
  endAt: number
  duration: number
}

// Serialised order entry (v2 format, backward-compatible: old format was string[])
type OrderEntry = { uuid: string; supersetGroup?: string }

interface SessionState {
  hydrated: boolean
  workout: Workout | null
  exercises: SessionExercise[]
  sets: WorkoutSet[]
  pauseStartedAt: number | null
  pausedTotalMs: number
  restTimer: RestTimer | null
  prFlags: Record<string, PRFlags>

  // lifecycle
  resumeActive: () => Promise<boolean>
  startWorkout: (exs: Exercise[]) => Promise<void>
  startFromRoutine: (routine: Routine, exs: Exercise[]) => Promise<void>
  finishWorkout: () => Promise<Workout | null>
  discardWorkout: () => Promise<void>

  // editing
  renameWorkout: (name: string) => void
  addExercises: (exs: Exercise[]) => Promise<void>
  removeExercise: (exerciseUuid: string) => Promise<void>
  setExerciseRest: (exerciseUuid: string, seconds: number) => void

  // supersets
  groupExercises: (uuidA: string, uuidB: string) => Promise<void>
  ungroupExercise: (uuid: string) => Promise<void>

  // sets
  addSet: (exerciseUuid: string) => Promise<void>
  addWarmupSets: (exerciseUuid: string, weights: number[], reps: number[]) => Promise<void>
  updateSet: (uuid: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'setType'>>) => Promise<void>
  toggleSetComplete: (uuid: string) => Promise<void>
  removeSet: (uuid: string) => Promise<void>

  // global timer
  togglePause: () => void
  elapsedMs: () => number

  // rest timer
  startRest: (exerciseUuid: string, seconds: number) => void
  adjustRest: (deltaSeconds: number) => void
  clearRest: () => void
}

function dayPartName(d: Date): string {
  const h = d.getHours()
  if (h < 12) return 'Morning Workout'
  if (h < 17) return 'Afternoon Workout'
  return 'Evening Workout'
}

async function persistOrder(exercises: SessionExercise[]): Promise<void> {
  const entries: OrderEntry[] = exercises.map(e => ({
    uuid: e.exercise.uuid,
    ...(e.supersetGroup ? { supersetGroup: e.supersetGroup } : {}),
  }))
  await db.settings.put({ key: ORDER_KEY, value: JSON.stringify(entries) })
}

async function buildSession(
  name: string,
  type: 'single' | 'routine',
  routineUuid: string | undefined,
  exs: Exercise[]
): Promise<{ workout: Workout; exercises: SessionExercise[]; sets: WorkoutSet[] }> {
  const now = Date.now()
  const defaultRest = await getSetting('defaultRestSeconds')
  const workout: Workout = {
    uuid: crypto.randomUUID(),
    name,
    type,
    routineUuid,
    startedAt: now,
    status: 'active',
    updatedAt: now,
    deletedAt: null,
  }
  await db.workouts.add(workout)
  const exercises: SessionExercise[] = exs.map(ex => ({ exercise: ex, restSeconds: defaultRest }))
  const sets: WorkoutSet[] = exs.map((ex, i) => ({
    uuid: crypto.randomUUID(),
    workoutUuid: workout.uuid,
    exerciseUuid: ex.uuid,
    setNumber: 1,
    weight: 0,
    reps: 0,
    restSeconds: defaultRest,
    setType: 'normal' as const,
    completedAt: undefined,
    updatedAt: now + i,
    deletedAt: null,
  }))
  await db.sets.bulkAdd(sets)
  await persistOrder(exercises)
  return { workout, exercises, sets }
}

const emptyState = {
  workout: null,
  exercises: [] as SessionExercise[],
  sets: [] as WorkoutSet[],
  pauseStartedAt: null as number | null,
  pausedTotalMs: 0,
  restTimer: null as RestTimer | null,
  prFlags: {} as Record<string, PRFlags>,
}

export const useSession = create<SessionState>((set, get) => ({
  hydrated: false,
  ...emptyState,

  resumeActive: async () => {
    if (get().workout) {
      set({ hydrated: true })
      return true
    }
    const active = await db.workouts
      .filter(w => w.status === 'active' && w.deletedAt === null)
      .toArray()
    if (active.length === 0) {
      set({ hydrated: true })
      return false
    }
    active.sort((a, b) => b.startedAt - a.startedAt)
    const workout = active[0]

    const loadedSets = (
      await db.sets
        .where('workoutUuid')
        .equals(workout.uuid)
        .filter(s => s.deletedAt === null)
        .toArray()
    ).sort((a, b) => a.setNumber - b.setNumber)

    // Parse order — handle both old (string[]) and new (OrderEntry[]) formats
    let orderedUuids: string[] = []
    const supersetGroupByUuid: Record<string, string | undefined> = {}
    const orderRow = await db.settings.get(ORDER_KEY)
    if (orderRow && typeof orderRow.value === 'string') {
      try {
        const parsed: unknown = JSON.parse(orderRow.value)
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === 'string') {
            orderedUuids = parsed as string[]
          } else {
            const entries = parsed as OrderEntry[]
            orderedUuids = entries.map(e => e.uuid)
            for (const e of entries) {
              if (e.supersetGroup) supersetGroupByUuid[e.uuid] = e.supersetGroup
            }
          }
        }
      } catch { /* ignore */ }
    }

    const seen = new Set<string>()
    const finalOrder: string[] = []
    for (const u of orderedUuids) if (!seen.has(u)) { seen.add(u); finalOrder.push(u) }
    for (const s of loadedSets) if (!seen.has(s.exerciseUuid)) { seen.add(s.exerciseUuid); finalOrder.push(s.exerciseUuid) }

    const exercises: SessionExercise[] = []
    for (const uuid of finalOrder) {
      const ex = await db.exercises.get(uuid)
      if (!ex) continue
      const exSets = loadedSets.filter(s => s.exerciseUuid === uuid)
      const rest = exSets.length ? (exSets[exSets.length - 1].restSeconds ?? DEFAULT_REST) : DEFAULT_REST
      exercises.push({ exercise: ex, restSeconds: rest, supersetGroup: supersetGroupByUuid[uuid] })
    }

    set({ hydrated: true, workout, exercises, sets: loadedSets, pauseStartedAt: null, pausedTotalMs: 0, restTimer: null, prFlags: {} })
    return true
  },

  startWorkout: async (exs) => {
    const built = await buildSession(dayPartName(new Date()), 'single', undefined, exs)
    set({ ...built, pauseStartedAt: null, pausedTotalMs: 0, restTimer: null, prFlags: {} })
  },

  startFromRoutine: async (routine, exs) => {
    const built = await buildSession(routine.name, 'routine', routine.uuid, exs)
    set({ ...built, pauseStartedAt: null, pausedTotalMs: 0, restTimer: null, prFlags: {} })
  },

  finishWorkout: async () => {
    const { workout, sets } = get()
    if (!workout) return null
    const now = Date.now()
    const empties = sets.filter(s => !s.completedAt && (s.weight ?? 0) === 0 && (s.reps ?? 0) === 0)
    for (const s of empties) {
      await db.sets.update(s.uuid, { deletedAt: now, updatedAt: now })
    }
    const finished: Workout = { ...workout, endedAt: now, status: 'finished', updatedAt: now }
    await db.workouts.put(finished)
    await db.settings.delete(ORDER_KEY)
    set({ ...emptyState })
    return finished
  },

  discardWorkout: async () => {
    const { workout } = get()
    if (!workout) return
    await db.sets.where('workoutUuid').equals(workout.uuid).delete()
    await db.workouts.delete(workout.uuid)
    await db.settings.delete(ORDER_KEY)
    set({ ...emptyState })
  },

  renameWorkout: (name) => {
    const { workout } = get()
    if (!workout) return
    const updated = { ...workout, name, updatedAt: Date.now() }
    set({ workout: updated })
    void db.workouts.put(updated)
  },

  addExercises: async (exs) => {
    const { exercises, sets, workout } = get()
    if (!workout) return
    const existing = new Set(exercises.map(e => e.exercise.uuid))
    const toAdd = exs.filter(e => !existing.has(e.uuid))
    if (toAdd.length === 0) return
    const now = Date.now()
    const defaultRest = await getSetting('defaultRestSeconds')
    const newExercises: SessionExercise[] = toAdd.map(ex => ({ exercise: ex, restSeconds: defaultRest }))
    const newSets: WorkoutSet[] = toAdd.map((ex, i) => ({
      uuid: crypto.randomUUID(),
      workoutUuid: workout.uuid,
      exerciseUuid: ex.uuid,
      setNumber: 1,
      weight: 0,
      reps: 0,
      restSeconds: defaultRest,
      setType: 'normal' as const,
      completedAt: undefined,
      updatedAt: now + i,
      deletedAt: null,
    }))
    await db.sets.bulkAdd(newSets)
    const nextExercises = [...exercises, ...newExercises]
    await persistOrder(nextExercises)
    set({ exercises: nextExercises, sets: [...sets, ...newSets] })
  },

  removeExercise: async (exerciseUuid) => {
    const { exercises, sets, restTimer, prFlags } = get()
    const now = Date.now()
    const toRemove = sets.filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
    for (const s of toRemove) await db.sets.update(s.uuid, { deletedAt: now, updatedAt: now })
    const nextExercises = exercises.filter(e => e.exercise.uuid !== exerciseUuid)

    // If the removed exercise was in a superset and now its partner is alone, clean up the group
    const removedGroup = exercises.find(e => e.exercise.uuid === exerciseUuid)?.supersetGroup
    let cleanedExercises = nextExercises
    if (removedGroup) {
      const remaining = nextExercises.filter(e => e.supersetGroup === removedGroup)
      if (remaining.length <= 1) {
        cleanedExercises = nextExercises.map(e =>
          e.supersetGroup === removedGroup ? { ...e, supersetGroup: undefined } : e
        )
      }
    }

    await persistOrder(cleanedExercises)
    const nextPrFlags = { ...prFlags }
    for (const s of toRemove) delete nextPrFlags[s.uuid]
    set({
      exercises: cleanedExercises,
      sets: sets.filter(s => s.exerciseUuid !== exerciseUuid),
      restTimer: restTimer?.exerciseUuid === exerciseUuid ? null : restTimer,
      prFlags: nextPrFlags,
    })
  },

  setExerciseRest: (exerciseUuid, seconds) => {
    const { exercises } = get()
    set({
      exercises: exercises.map(e =>
        e.exercise.uuid === exerciseUuid ? { ...e, restSeconds: Math.max(0, seconds) } : e
      ),
    })
  },

  groupExercises: async (uuidA, uuidB) => {
    const { exercises } = get()
    // If either is already in a group, use that group; otherwise create a new one
    const existingGroup =
      exercises.find(e => e.exercise.uuid === uuidA)?.supersetGroup ||
      exercises.find(e => e.exercise.uuid === uuidB)?.supersetGroup ||
      crypto.randomUUID()
    const next = exercises.map(e =>
      e.exercise.uuid === uuidA || e.exercise.uuid === uuidB
        ? { ...e, supersetGroup: existingGroup }
        : e
    )
    set({ exercises: next })
    await persistOrder(next)
  },

  ungroupExercise: async (uuid) => {
    const { exercises } = get()
    const group = exercises.find(e => e.exercise.uuid === uuid)?.supersetGroup
    if (!group) return
    // Remove this exercise from the group
    let next = exercises.map(e => e.exercise.uuid === uuid ? { ...e, supersetGroup: undefined } : e)
    // If only one exercise remains in the group, dissolve it too
    const remaining = next.filter(e => e.supersetGroup === group)
    if (remaining.length <= 1) {
      next = next.map(e => e.supersetGroup === group ? { ...e, supersetGroup: undefined } : e)
    }
    set({ exercises: next })
    await persistOrder(next)
  },

  addSet: async (exerciseUuid) => {
    const { sets, exercises, workout } = get()
    if (!workout) return
    const exRest = exercises.find(e => e.exercise.uuid === exerciseUuid)?.restSeconds ?? DEFAULT_REST
    const exSets = sets
      .filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
      .sort((a, b) => a.setNumber - b.setNumber)
    const last = exSets[exSets.length - 1]
    const newSet: WorkoutSet = {
      uuid: crypto.randomUUID(),
      workoutUuid: workout.uuid,
      exerciseUuid,
      setNumber: exSets.length + 1,
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 0,
      rpe: last?.rpe,
      restSeconds: exRest,
      setType: 'normal',
      completedAt: undefined,
      updatedAt: Date.now(),
      deletedAt: null,
    }
    await db.sets.add(newSet)
    set({ sets: [...sets, newSet] })
  },

  addWarmupSets: async (exerciseUuid, weights, repsArr) => {
    const { sets, exercises, workout } = get()
    if (!workout) return
    const exRest = exercises.find(e => e.exercise.uuid === exerciseUuid)?.restSeconds ?? DEFAULT_REST
    const exSets = sets
      .filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
      .sort((a, b) => a.setNumber - b.setNumber)
    const now = Date.now()
    const newSets: WorkoutSet[] = weights.map((w, i) => ({
      uuid: crypto.randomUUID(),
      workoutUuid: workout.uuid,
      exerciseUuid,
      setNumber: exSets.length + i + 1,
      weight: w,
      reps: repsArr[i] ?? 5,
      restSeconds: exRest,
      setType: 'warmup' as const,
      completedAt: undefined,
      updatedAt: now + i,
      deletedAt: null,
    }))
    await db.sets.bulkAdd(newSets)
    set({ sets: [...sets, ...newSets] })
  },

  updateSet: async (uuid, patch) => {
    const { sets } = get()
    const now = Date.now()
    set({ sets: sets.map(s => (s.uuid === uuid ? { ...s, ...patch, updatedAt: now } : s)) })
    await db.sets.update(uuid, { ...patch, updatedAt: now })
  },

  toggleSetComplete: async (uuid) => {
    const { sets, exercises } = get()
    const target = sets.find(s => s.uuid === uuid)
    if (!target) return
    const now = Date.now()
    const willComplete = !target.completedAt
    const completedAt = willComplete ? now : undefined
    set({ sets: sets.map(s => (s.uuid === uuid ? { ...s, completedAt, updatedAt: now } : s)) })
    await db.sets.update(uuid, { completedAt, updatedAt: now })

    if (willComplete) {
      const exEntry = exercises.find(e => e.exercise.uuid === target.exerciseUuid)
      const exRest = exEntry?.restSeconds ?? DEFAULT_REST
      const supersetGroup = exEntry?.supersetGroup

      // For supersets: only fire rest when all group members have equal completed-set count.
      let shouldRest = true
      if (supersetGroup) {
        const groupExs = exercises.filter(e => e.supersetGroup === supersetGroup)
        const updatedSets = get().sets
        const counts = groupExs.map(e =>
          updatedSets.filter(s => s.exerciseUuid === e.exercise.uuid && s.completedAt && s.deletedAt === null).length
        )
        shouldRest = counts.every(c => c === counts[0])
      }

      if (shouldRest && exRest > 0) get().startRest(target.exerciseUuid, exRest)

      const flags = await detectSetPR({ ...target, completedAt })
      if (hasPR(flags)) {
        set({ prFlags: { ...get().prFlags, [uuid]: flags } })
        playFanfare()
        vibrate([0, 60, 40, 60, 40, 120])
      }
    } else if (get().prFlags[uuid]) {
      const next = { ...get().prFlags }
      delete next[uuid]
      set({ prFlags: next })
    }
  },

  removeSet: async (uuid) => {
    const { sets } = get()
    const target = sets.find(s => s.uuid === uuid)
    if (!target) return
    const exerciseUuid = target.exerciseUuid
    const remaining = sets.filter(
      s => s.exerciseUuid === exerciseUuid && s.deletedAt === null && s.uuid !== uuid
    )
    if (remaining.length === 0) {
      await get().removeExercise(exerciseUuid)
      return
    }
    const now = Date.now()
    await db.sets.update(uuid, { deletedAt: now, updatedAt: now })
    const ordered = remaining.sort((a, b) => a.setNumber - b.setNumber)
    const renumbered = new Map<string, number>()
    ordered.forEach((s, i) => {
      if (s.setNumber !== i + 1) renumbered.set(s.uuid, i + 1)
    })
    for (const [id, n] of renumbered) await db.sets.update(id, { setNumber: n, updatedAt: now })
    const nextFlags = { ...get().prFlags }
    delete nextFlags[uuid]
    set({
      sets: get()
        .sets.filter(s => s.uuid !== uuid)
        .map(s => (renumbered.has(s.uuid) ? { ...s, setNumber: renumbered.get(s.uuid)! } : s)),
      prFlags: nextFlags,
    })
  },

  togglePause: () => {
    const { pauseStartedAt, pausedTotalMs } = get()
    const now = Date.now()
    if (pauseStartedAt === null) set({ pauseStartedAt: now })
    else set({ pausedTotalMs: pausedTotalMs + (now - pauseStartedAt), pauseStartedAt: null })
  },

  elapsedMs: () => {
    const { workout, pausedTotalMs, pauseStartedAt } = get()
    if (!workout) return 0
    const now = Date.now()
    return now - workout.startedAt - pausedTotalMs - (pauseStartedAt ? now - pauseStartedAt : 0)
  },

  startRest: (exerciseUuid, seconds) => {
    const now = Date.now()
    set({ restTimer: { exerciseUuid, startedAt: now, endAt: now + seconds * 1000, duration: seconds } })
  },

  adjustRest: (deltaSeconds) => {
    const { restTimer } = get()
    if (!restTimer) return
    const now = Date.now()
    const newEnd = Math.max(now, restTimer.endAt + deltaSeconds * 1000)
    const newDuration = Math.max(1, restTimer.duration + deltaSeconds)
    set({ restTimer: { ...restTimer, endAt: newEnd, duration: newDuration } })
  },

  clearRest: () => set({ restTimer: null }),
}))
