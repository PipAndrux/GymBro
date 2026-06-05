import { create } from 'zustand'
import { db } from '../db'
import type { Exercise, Workout, WorkoutSet, Routine } from '../types'
import { getSetting, DEFAULT_SETTINGS } from '../lib/settings'

export const DEFAULT_REST = DEFAULT_SETTINGS.defaultRestSeconds
const ORDER_KEY = 'active_session_order'

export interface SessionExercise {
  exercise: Exercise
  restSeconds: number
}

export interface RestTimer {
  exerciseUuid: string
  startedAt: number
  endAt: number
  duration: number
}

interface SessionState {
  hydrated: boolean
  workout: Workout | null
  exercises: SessionExercise[]
  sets: WorkoutSet[]
  // Global workout timer (pausable). Elapsed is derived, not ticked.
  pauseStartedAt: number | null
  pausedTotalMs: number
  // Single active rest timer (one rest runs at a time, like Hevy/Strong).
  restTimer: RestTimer | null

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

  // sets
  addSet: (exerciseUuid: string) => Promise<void>
  updateSet: (uuid: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>>) => Promise<void>
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

// The exercise order for the active session is persisted to the settings table
// (the schema has no per-workout exercise order — only routines do), so an
// in-progress workout fully restores after a refresh or crash.
async function persistOrder(uuids: string[]): Promise<void> {
  await db.settings.put({ key: ORDER_KEY, value: JSON.stringify(uuids) })
}

// Creates the workout + a first set per exercise, and persists the order.
// Shared by single workouts and routine-launched workouts.
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
    completedAt: undefined,
    updatedAt: now + i,
    deletedAt: null,
  }))
  await db.sets.bulkAdd(sets)
  await persistOrder(exs.map(e => e.uuid))
  return { workout, exercises, sets }
}

const emptyState = {
  workout: null,
  exercises: [] as SessionExercise[],
  sets: [] as WorkoutSet[],
  pauseStartedAt: null as number | null,
  pausedTotalMs: 0,
  restTimer: null as RestTimer | null,
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

    // Rebuild exercise order from the persisted order, then any leftovers from sets.
    let order: string[] = []
    const orderRow = await db.settings.get(ORDER_KEY)
    if (orderRow && typeof orderRow.value === 'string') {
      try {
        order = JSON.parse(orderRow.value) as string[]
      } catch {
        order = []
      }
    }
    const seen = new Set<string>()
    const orderedUuids: string[] = []
    for (const u of order) if (!seen.has(u)) { seen.add(u); orderedUuids.push(u) }
    for (const s of loadedSets) if (!seen.has(s.exerciseUuid)) { seen.add(s.exerciseUuid); orderedUuids.push(s.exerciseUuid) }

    const exercises: SessionExercise[] = []
    for (const uuid of orderedUuids) {
      const ex = await db.exercises.get(uuid)
      if (!ex) continue
      const exSets = loadedSets.filter(s => s.exerciseUuid === uuid)
      const rest = exSets.length ? (exSets[exSets.length - 1].restSeconds ?? DEFAULT_REST) : DEFAULT_REST
      exercises.push({ exercise: ex, restSeconds: rest })
    }

    set({
      hydrated: true,
      workout,
      exercises,
      sets: loadedSets,
      pauseStartedAt: null,
      pausedTotalMs: 0,
      restTimer: null,
    })
    return true
  },

  startWorkout: async (exs) => {
    const built = await buildSession(dayPartName(new Date()), 'single', undefined, exs)
    set({ ...built, pauseStartedAt: null, pausedTotalMs: 0, restTimer: null })
  },

  startFromRoutine: async (routine, exs) => {
    const built = await buildSession(routine.name, 'routine', routine.uuid, exs)
    set({ ...built, pauseStartedAt: null, pausedTotalMs: 0, restTimer: null })
  },

  finishWorkout: async () => {
    const { workout, sets } = get()
    if (!workout) return null
    const now = Date.now()
    // Prune empty placeholder sets (never completed, nothing entered) so history stays clean.
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
    // An unfinished, discarded workout never became "real" — hard delete to avoid clutter.
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
      completedAt: undefined,
      updatedAt: now + i,
      deletedAt: null,
    }))
    await db.sets.bulkAdd(newSets)
    const nextExercises = [...exercises, ...newExercises]
    await persistOrder(nextExercises.map(e => e.exercise.uuid))
    set({ exercises: nextExercises, sets: [...sets, ...newSets] })
  },

  removeExercise: async (exerciseUuid) => {
    const { exercises, sets, restTimer } = get()
    const now = Date.now()
    const toRemove = sets.filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
    for (const s of toRemove) await db.sets.update(s.uuid, { deletedAt: now, updatedAt: now })
    const nextExercises = exercises.filter(e => e.exercise.uuid !== exerciseUuid)
    await persistOrder(nextExercises.map(e => e.exercise.uuid))
    set({
      exercises: nextExercises,
      sets: sets.filter(s => s.exerciseUuid !== exerciseUuid),
      restTimer: restTimer?.exerciseUuid === exerciseUuid ? null : restTimer,
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

  addSet: async (exerciseUuid) => {
    const { sets, exercises, workout } = get()
    if (!workout) return
    const exRest = exercises.find(e => e.exercise.uuid === exerciseUuid)?.restSeconds ?? DEFAULT_REST
    const exSets = sets
      .filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
      .sort((a, b) => a.setNumber - b.setNumber)
    const last = exSets[exSets.length - 1]
    // Carry forward the previous set's weight/reps so logging the next set is fast.
    const newSet: WorkoutSet = {
      uuid: crypto.randomUUID(),
      workoutUuid: workout.uuid,
      exerciseUuid,
      setNumber: exSets.length + 1,
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 0,
      rpe: last?.rpe,
      restSeconds: exRest,
      completedAt: undefined,
      updatedAt: Date.now(),
      deletedAt: null,
    }
    await db.sets.add(newSet)
    set({ sets: [...sets, newSet] })
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
    // Completing a set kicks off that exercise's rest timer.
    if (willComplete) {
      const exRest = exercises.find(e => e.exercise.uuid === target.exerciseUuid)?.restSeconds ?? DEFAULT_REST
      if (exRest > 0) get().startRest(target.exerciseUuid, exRest)
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
    // Removing the last set of an exercise removes the exercise from the session
    // (keeps the invariant: every session exercise has at least one set row).
    if (remaining.length === 0) {
      await get().removeExercise(exerciseUuid)
      return
    }
    const now = Date.now()
    await db.sets.update(uuid, { deletedAt: now, updatedAt: now })
    // Renumber the remaining sets so set numbers stay sequential.
    const ordered = remaining.sort((a, b) => a.setNumber - b.setNumber)
    const renumbered = new Map<string, number>()
    ordered.forEach((s, i) => {
      if (s.setNumber !== i + 1) renumbered.set(s.uuid, i + 1)
    })
    for (const [id, n] of renumbered) await db.sets.update(id, { setNumber: n, updatedAt: now })
    set({
      sets: get()
        .sets.filter(s => s.uuid !== uuid)
        .map(s => (renumbered.has(s.uuid) ? { ...s, setNumber: renumbered.get(s.uuid)! } : s)),
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
