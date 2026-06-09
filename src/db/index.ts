import Dexie, { type Table } from 'dexie'
import type { Exercise, Routine, Workout, WorkoutSet, Food, FoodEntry, DailyGoal, Setting, Measurement, MeasurementEntry, SyncState, SavedMeal, Recipe, WaterEntry } from '../types'
import { EXERCISE_SEED } from '../data/exercises.seed'

class FitTrackerDB extends Dexie {
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  workouts!: Table<Workout, string>
  sets!: Table<WorkoutSet, string>
  foods!: Table<Food, string>
  foodEntries!: Table<FoodEntry, string>
  dailyGoals!: Table<DailyGoal, string>
  settings!: Table<Setting, string>
  measurements!: Table<Measurement, string>
  measurementEntries!: Table<MeasurementEntry, string>
  syncState!: Table<SyncState, string>
  savedMeals!: Table<SavedMeal, string>
  recipes!: Table<Recipe, string>
  waterEntries!: Table<WaterEntry, string>

  constructor() {
    super('FitTrackerDB')

    this.version(1).stores({
      exercises: '&uuid, name, primaryMuscle, equipment, category, isCustom, updatedAt, deletedAt',
      routines: '&uuid, name, createdAt, updatedAt, deletedAt',
      workouts: '&uuid, routineUuid, startedAt, endedAt, status, updatedAt, deletedAt',
      sets: '&uuid, workoutUuid, exerciseUuid, completedAt, updatedAt, deletedAt',
      foods: '&uuid, name, isCustom, updatedAt, deletedAt',
      foodEntries: '&uuid, date, foodUuid, mealType, updatedAt, deletedAt',
      dailyGoals: '&uuid, date, updatedAt, deletedAt',
      settings: '&key',
    })

    this.version(2).stores({
      exercises: '&uuid, name, primaryMuscle, equipment, category, isCustom, updatedAt, deletedAt',
      routines: '&uuid, name, createdAt, updatedAt, deletedAt',
      workouts: '&uuid, routineUuid, startedAt, endedAt, status, updatedAt, deletedAt',
      sets: '&uuid, workoutUuid, exerciseUuid, completedAt, updatedAt, deletedAt',
      foods: '&uuid, name, isCustom, updatedAt, deletedAt',
      foodEntries: '&uuid, date, foodUuid, mealType, updatedAt, deletedAt',
      dailyGoals: '&uuid, date, updatedAt, deletedAt',
      settings: '&key',
      measurements: '&uuid, type, sortOrder, updatedAt, deletedAt',
      measurementEntries: '&uuid, measurementUuid, date, updatedAt, deletedAt',
    })

    // v3 — cloud sync (Phase 6): per-user push/pull cursors. All existing
    // stores carry over unchanged; only the syncState table is added.
    this.version(3).stores({
      exercises: '&uuid, name, primaryMuscle, equipment, category, isCustom, updatedAt, deletedAt',
      routines: '&uuid, name, createdAt, updatedAt, deletedAt',
      workouts: '&uuid, routineUuid, startedAt, endedAt, status, updatedAt, deletedAt',
      sets: '&uuid, workoutUuid, exerciseUuid, completedAt, updatedAt, deletedAt',
      foods: '&uuid, name, isCustom, updatedAt, deletedAt',
      foodEntries: '&uuid, date, foodUuid, mealType, updatedAt, deletedAt',
      dailyGoals: '&uuid, date, updatedAt, deletedAt',
      settings: '&key',
      measurements: '&uuid, type, sortOrder, updatedAt, deletedAt',
      measurementEntries: '&uuid, measurementUuid, date, updatedAt, deletedAt',
      syncState: '&id',
    })

    // v4 — Phase 2: saved meals, recipes, water tracking.
    this.version(4).stores({
      exercises: '&uuid, name, primaryMuscle, equipment, category, isCustom, updatedAt, deletedAt',
      routines: '&uuid, name, createdAt, updatedAt, deletedAt',
      workouts: '&uuid, routineUuid, startedAt, endedAt, status, updatedAt, deletedAt',
      sets: '&uuid, workoutUuid, exerciseUuid, completedAt, updatedAt, deletedAt',
      foods: '&uuid, name, isCustom, updatedAt, deletedAt',
      foodEntries: '&uuid, date, foodUuid, mealType, updatedAt, deletedAt',
      dailyGoals: '&uuid, date, updatedAt, deletedAt',
      settings: '&key',
      measurements: '&uuid, type, sortOrder, updatedAt, deletedAt',
      measurementEntries: '&uuid, measurementUuid, date, updatedAt, deletedAt',
      syncState: '&id',
      savedMeals: '&uuid, updatedAt, deletedAt',
      recipes: '&uuid, updatedAt, deletedAt',
      waterEntries: '&uuid, date, updatedAt, deletedAt',
    })

    // Seed built-in exercises on first DB creation
    this.on('populate', async () => {
      await this.exercises.bulkAdd(EXERCISE_SEED)
    })
  }
}

export const db = new FitTrackerDB()

/** Re-seed exercises if the table is empty (e.g. after a manual clear). */
export async function ensureExercisesSeed() {
  const count = await db.exercises.count()
  if (count === 0) {
    await db.exercises.bulkAdd(EXERCISE_SEED)
  }
}

// ── Singleton id helpers ────────────────────────────────────────────────────────
// Some records are logically singletons (one primary measurement per type, one
// goal per date). Deriving a deterministic uuid means the same logical record
// created independently on two devices converges to one row under last-write-wins,
// instead of duplicating after sync.

/** Deterministic uuid for a predefined (non-custom) measurement type. */
export function measurementUuidForType(type: string): string {
  return `measurement-${type}`
}

/** Deterministic uuid for a day's nutrition goal. */
export function dailyGoalUuid(date: string): string {
  return `goal-${date}`
}

const PRIMARY_MEASUREMENTS = [
  { type: 'weight', label: 'Body Weight', unit: 'kg', sortOrder: 0 },
  { type: 'height', label: 'Height', unit: 'cm', sortOrder: 1 },
] as const

/**
 * Ensure the primary measurements exist AND collapse any duplicate non-custom
 * measurements (same `type`) down to a single deterministic record, repointing
 * their history entries onto the survivor. Idempotent: once converged it writes
 * nothing, so it is safe to call reactively. Fixes duplicate cards that appear
 * after syncing a device that created weight/height/etc. with random uuids.
 */
let consolidatingMeasurements = false
export async function consolidateMeasurements(): Promise<void> {
  if (consolidatingMeasurements) return // avoid overlapping runs from reactive triggers
  consolidatingMeasurements = true
  try {
  const now = Date.now()
  const active = await db.measurements.filter(m => m.deletedAt === null).toArray()

  // Group non-custom measurements by type (custom ones are intentionally unique).
  const byType = new Map<string, Measurement[]>()
  for (const m of active) {
    if (m.isCustom) continue
    const arr = byType.get(m.type)
    if (arr) arr.push(m)
    else byType.set(m.type, [m])
  }

  // Make sure the two primaries always exist.
  for (const p of PRIMARY_MEASUREMENTS) {
    if (!byType.has(p.type)) {
      const m: Measurement = {
        uuid: measurementUuidForType(p.type), type: p.type, label: p.label,
        unit: p.unit, isCustom: false, sortOrder: p.sortOrder, updatedAt: now, deletedAt: null,
      }
      await db.measurements.add(m)
      byType.set(p.type, [m])
    }
  }

  // Collapse each type to its canonical uuid.
  for (const [type, group] of byType) {
    const canonicalUuid = measurementUuidForType(type)
    if (group.length === 1 && group[0].uuid === canonicalUuid) continue // already converged

    // Most-recently-updated record provides the surviving label/unit/sortOrder.
    const survivor = group.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a))
    await db.measurements.put({
      uuid: canonicalUuid, type, label: survivor.label, unit: survivor.unit,
      isCustom: false, sortOrder: survivor.sortOrder, updatedAt: now, deletedAt: null,
    })

    for (const m of group) {
      if (m.uuid === canonicalUuid) continue
      const entries = await db.measurementEntries.where('measurementUuid').equals(m.uuid).toArray()
      for (const e of entries) {
        if (e.deletedAt !== null) continue
        await db.measurementEntries.update(e.uuid, { measurementUuid: canonicalUuid, updatedAt: now })
      }
      await db.measurements.update(m.uuid, { deletedAt: now, updatedAt: now })
    }
  }
  } finally {
    consolidatingMeasurements = false
  }
}

/**
 * Collapse duplicate nutrition goals (same `date`) to one deterministic record,
 * keeping the most recently edited values. Idempotent.
 */
let consolidatingGoals = false
export async function consolidateDailyGoals(): Promise<void> {
  if (consolidatingGoals) return
  consolidatingGoals = true
  try {
  const now = Date.now()
  const active = await db.dailyGoals.filter(g => g.deletedAt === null).toArray()

  const byDate = new Map<string, DailyGoal[]>()
  for (const g of active) {
    const arr = byDate.get(g.date)
    if (arr) arr.push(g)
    else byDate.set(g.date, [g])
  }

  for (const [date, group] of byDate) {
    const canonicalUuid = dailyGoalUuid(date)
    if (group.length === 1 && group[0].uuid === canonicalUuid) continue

    const survivor = group.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a))
    await db.dailyGoals.put({ ...survivor, uuid: canonicalUuid, updatedAt: now })
    for (const g of group) {
      if (g.uuid === canonicalUuid) continue
      await db.dailyGoals.update(g.uuid, { deletedAt: now, updatedAt: now })
    }
  }
  } finally {
    consolidatingGoals = false
  }
}
