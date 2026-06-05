import type { Food } from '../types'

export interface MacroResult {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function macrosForGrams(food: Food, grams: number): MacroResult {
  const f = grams / 100
  return {
    calories: Math.round(food.caloriesPer100g * f),
    protein: Math.round(food.protein * f * 10) / 10,
    carbs: Math.round(food.carbs * f * 10) / 10,
    fat: Math.round(food.fat * f * 10) / 10,
  }
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateDisplay(dateStr: string): string {
  const now = new Date()
  const t = todayStr()
  const yd = new Date(now)
  yd.setDate(yd.getDate() - 1)
  const yStr = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`
  if (dateStr === t) return 'Today'
  if (dateStr === yStr) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export const DEFAULT_GOALS = { calorieGoal: 2000, proteinGoal: 150, carbGoal: 200, fatGoal: 70 }
