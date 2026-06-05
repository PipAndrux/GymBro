import type { MuscleGroup, Equipment } from '../types'

// Shared exercise metadata used by the library screen and the session picker.

export const MUSCLE_FILTERS: { label: string; value: 'all' | MuscleGroup }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Biceps', value: 'biceps' },
  { label: 'Triceps', value: 'triceps' },
  { label: 'Forearms', value: 'forearms' },
  { label: 'Quads', value: 'quads' },
  { label: 'Hamstrings', value: 'hamstrings' },
  { label: 'Glutes', value: 'glutes' },
  { label: 'Calves', value: 'calves' },
  { label: 'Core', value: 'core' },
  { label: 'Cardio', value: 'cardio' },
]

export const EQUIPMENT_FILTERS: { label: string; value: 'all' | Equipment }[] = [
  { label: 'All', value: 'all' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cable', value: 'cable' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Band', value: 'band' },
  { label: 'Smith', value: 'smith' },
]

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#a855f7',
  biceps: '#f97316',
  triceps: '#eab308',
  forearms: '#84cc16',
  quads: '#22c55e',
  hamstrings: '#14b8a6',
  glutes: '#ec4899',
  calves: '#6366f1',
  core: '#06b6d4',
  cardio: '#94a3b8',
}
