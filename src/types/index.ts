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
  value: string | number | boolean
}
