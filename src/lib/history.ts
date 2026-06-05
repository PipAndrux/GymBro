import { db } from '../db'

export interface LastPerformance {
  weight: number
  reps: number
}

/**
 * Most recent completed set for an exercise across past workouts — used in a
 * routine session to show "what to beat". Optionally excludes the current workout.
 */
export async function getLastPerformance(
  exerciseUuid: string,
  excludeWorkoutUuid?: string
): Promise<LastPerformance | null> {
  const sets = await db.sets
    .where('exerciseUuid')
    .equals(exerciseUuid)
    .filter(
      s =>
        s.deletedAt === null &&
        s.completedAt != null &&
        s.workoutUuid !== excludeWorkoutUuid
    )
    .toArray()
  if (sets.length === 0) return null
  sets.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  const last = sets[0]
  return { weight: last.weight, reps: last.reps }
}
