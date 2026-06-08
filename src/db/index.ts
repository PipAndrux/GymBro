import Dexie, { type Table } from 'dexie'
import type { Exercise, Routine, Workout, WorkoutSet, Food, FoodEntry, DailyGoal, Setting, Measurement, MeasurementEntry, SyncState } from '../types'
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

/** Ensure the two primary measurements (weight, height) always exist. */
export async function ensurePrimaryMeasurements() {
  const existing = await db.measurements.filter(m => m.deletedAt === null).toArray()
  const types = new Set(existing.map(m => m.type))
  const now = Date.now()
  const toAdd: import('../types').Measurement[] = []
  if (!types.has('weight')) {
    toAdd.push({ uuid: crypto.randomUUID(), type: 'weight', label: 'Body Weight', unit: 'kg', isCustom: false, sortOrder: 0, updatedAt: now, deletedAt: null })
  }
  if (!types.has('height')) {
    toAdd.push({ uuid: crypto.randomUUID(), type: 'height', label: 'Height', unit: 'cm', isCustom: false, sortOrder: 1, updatedAt: now, deletedAt: null })
  }
  if (toAdd.length > 0) await db.measurements.bulkAdd(toAdd)
}
