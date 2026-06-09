import { db } from '../db'

export interface PeriodStats {
  workoutCount: number
  totalVolumeKg: number
  totalDurationMs: number
  topExercises: { name: string; sets: number; volume: number }[]
  avgDailyCalories: number
  measurementDeltas: { label: string; startValue: number; endValue: number; unit: string }[]
}

function toDateStr(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function weekRange(): [number, number] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const day = now.getDay() // 0=Sun
  const offset = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + offset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return [start.getTime(), end.getTime()]
}

export function monthRange(): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return [start.getTime(), end.getTime()]
}

export async function getPeriodStats(startMs: number, endMs: number): Promise<PeriodStats> {
  const startDate = toDateStr(startMs)
  const endDate   = toDateStr(endMs)

  const workouts = await db.workouts.filter(w =>
    w.status === 'finished' && w.deletedAt === null &&
    w.startedAt >= startMs && w.startedAt <= endMs
  ).toArray()

  let totalVolumeKg = 0
  let totalDurationMs = 0
  const exAgg = new Map<string, { sets: number; volume: number }>()

  for (const w of workouts) {
    const sets = await db.sets.where('workoutUuid').equals(w.uuid)
      .filter(s => s.deletedAt === null).toArray()
    const vol = sets.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0), 0)
    totalVolumeKg  += vol
    totalDurationMs += (w.endedAt ?? w.startedAt) - w.startedAt

    for (const s of sets) {
      const v = (s.weight || 0) * (s.reps || 0)
      const cur = exAgg.get(s.exerciseUuid)
      if (!cur) exAgg.set(s.exerciseUuid, { sets: 1, volume: v })
      else { cur.sets++; cur.volume += v }
    }
  }

  const uuids = [...exAgg.keys()]
  const exercises = await db.exercises.bulkGet(uuids)
  const topExercises = uuids
    .map((uuid, i) => ({ name: exercises[i]?.name ?? '?', ...exAgg.get(uuid)! }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)

  // Average daily calories
  const allFoods = await db.foods.toArray()
  const foodMap = new Map(allFoods.map(f => [f.uuid, f]))
  const entries = await db.foodEntries.filter(e =>
    e.deletedAt === null && e.date >= startDate && e.date <= endDate
  ).toArray()
  const calsByDate = new Map<string, number>()
  for (const entry of entries) {
    const food = foodMap.get(entry.foodUuid)
    if (!food) continue
    const cals = (food.caloriesPer100g / 100) * entry.grams
    calsByDate.set(entry.date, (calsByDate.get(entry.date) ?? 0) + cals)
  }
  const avgDailyCalories = calsByDate.size > 0
    ? [...calsByDate.values()].reduce((s, v) => s + v, 0) / calsByDate.size
    : 0

  // Measurement deltas for this period
  const measurements = await db.measurements.filter(m => m.deletedAt === null).toArray()
  const measurementDeltas: PeriodStats['measurementDeltas'] = []
  for (const m of measurements) {
    const mEntries = await db.measurementEntries.where('measurementUuid').equals(m.uuid)
      .filter(e => e.deletedAt === null && e.date >= startDate && e.date <= endDate).toArray()
    mEntries.sort((a, b) => a.date.localeCompare(b.date))
    if (mEntries.length >= 2) {
      measurementDeltas.push({
        label: m.label,
        startValue: mEntries[0].value,
        endValue: mEntries[mEntries.length - 1].value,
        unit: m.unit,
      })
    }
  }

  return { workoutCount: workouts.length, totalVolumeKg, totalDurationMs, topExercises, avgDailyCalories, measurementDeltas }
}
