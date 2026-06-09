export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'smith'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'

export type Category = 'strength' | 'cardio'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure'

export interface Exercise {
  uuid: string
  name: string
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  category: Category
  isCustom: boolean
  updatedAt: number
  deletedAt: number | null
}

export interface Routine {
  uuid: string
  name: string
  exerciseOrder: string[]
  notes?: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface Workout {
  uuid: string
  name: string
  type: 'single' | 'routine'
  routineUuid?: string
  startedAt: number
  endedAt?: number
  status: 'active' | 'finished'
  updatedAt: number
  deletedAt: number | null
}

export interface WorkoutSet {
  uuid: string
  workoutUuid: string
  exerciseUuid: string
  setNumber: number
  weight: number
  reps: number
  rpe?: number
  restSeconds?: number
  completedAt?: number
  setType?: SetType
  supersetGroup?: string
  updatedAt: number
  deletedAt: number | null
}

export interface Food {
  uuid: string
  name: string
  brand?: string
  caloriesPer100g: number
  protein: number
  carbs: number
  fat: number
  isCustom: boolean
  updatedAt: number
  deletedAt: number | null
}

export interface FoodEntry {
  uuid: string
  date: string
  foodUuid: string
  mealType: MealType
  grams: number
  updatedAt: number
  deletedAt: number | null
}

export interface DailyGoal {
  uuid: string
  date: string
  calorieGoal: number
  proteinGoal: number
  carbGoal: number
  fatGoal: number
  updatedAt: number
  deletedAt: number | null
}

export interface Setting {
  key: string
  value: string | number | boolean | number[]
}

export interface SavedMealItem {
  foodUuid: string
  grams: number
}

export interface SavedMeal {
  uuid: string
  name: string
  items: SavedMealItem[]
  updatedAt: number
  deletedAt: number | null
}

export interface RecipeIngredient {
  foodUuid: string
  grams: number
}

export interface Recipe {
  uuid: string
  name: string
  servings: number
  ingredients: RecipeIngredient[]
  updatedAt: number
  deletedAt: number | null
}

export interface WaterEntry {
  uuid: string
  date: string
  ml: number
  updatedAt: number
  deletedAt: number | null
}

/** Per-user cloud-sync cursors (Phase 6). One row per signed-in Supabase user. */
export interface SyncState {
  id: string                       // Supabase user id (auth.uid())
  lastPushedAt: number             // max local updatedAt already pushed (local clock)
  lastPulledServerAt: string | null // max server_updated_at already pulled (server clock, ISO)
}

export interface Measurement {
  uuid: string
  type: string
  label: string
  unit: string
  isCustom: boolean
  sortOrder: number
  updatedAt: number
  deletedAt: number | null
}

export interface MeasurementEntry {
  uuid: string
  measurementUuid: string
  value: number
  date: string      // 'YYYY-MM-DD'
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
