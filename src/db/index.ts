import Dexie, { type Table } from 'dexie'
import type { Exercise, Routine, Workout, WorkoutSet, Food, FoodEntry, DailyGoal, Setting } from '../types'
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
