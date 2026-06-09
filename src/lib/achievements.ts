import { db } from '../db'
import { estimate1RM } from './prs'

export interface Badge {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'flame' | 'zap' | 'award' | 'dumbbell' | 'star'
  tier: 'bronze' | 'silver' | 'gold'
}

export const ALL_BADGES: Badge[] = [
  // Workout count
  { id: 'first_workout',  title: 'First Step',       description: 'Complete your first workout',   icon: 'dumbbell', tier: 'bronze' },
  { id: 'workouts_10',    title: 'Getting Serious',   description: '10 workouts completed',         icon: 'trophy',   tier: 'bronze' },
  { id: 'workouts_25',    title: 'Committed',         description: '25 workouts completed',         icon: 'trophy',   tier: 'silver' },
  { id: 'workouts_50',    title: 'Halfway There',     description: '50 workouts completed',         icon: 'trophy',   tier: 'silver' },
  { id: 'workouts_100',   title: 'Centurion',         description: '100 workouts completed',        icon: 'trophy',   tier: 'gold'   },
  // Streaks (consecutive workout days)
  { id: 'streak_7',       title: 'Week Warrior',      description: '7-day workout streak',          icon: 'flame',    tier: 'bronze' },
  { id: 'streak_30',      title: 'Month Strong',      description: '30-day workout streak',         icon: 'flame',    tier: 'silver' },
  { id: 'streak_100',     title: 'Unstoppable',       description: '100-day workout streak',        icon: 'flame',    tier: 'gold'   },
  // PRs
  { id: 'first_pr',       title: 'Record Breaker',    description: 'Set your first personal record', icon: 'zap',    tier: 'bronze' },
  { id: 'prs_10',         title: 'PR Machine',        description: '10 personal records set',       icon: 'zap',      tier: 'silver' },
  { id: 'prs_25',         title: 'PR Hunter',         description: '25 personal records set',       icon: 'zap',      tier: 'gold'   },
  // Volume
  { id: 'volume_10k',     title: 'Heavy Lifter',      description: 'Lift 10,000 kg total volume',   icon: 'award',    tier: 'bronze' },
  { id: 'volume_50k',     title: 'Iron Stacker',      description: 'Lift 50,000 kg total volume',   icon: 'award',    tier: 'silver' },
  { id: 'volume_100k',    title: 'Volume Monster',    description: 'Lift 100,000 kg total volume',  icon: 'award',    tier: 'gold'   },
]

export interface AchievementStats {
  workoutCount: number
  longestStreak: number
  currentStreak: number
  prCount: number
  totalVolumeKg: number
}

function toDateStr(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function computeAchievementStats(): Promise<AchievementStats> {
  const finished = await db.workouts.filter(w => w.status === 'finished' && w.deletedAt === null).toArray()
  const workoutCount = finished.length

  // Streak calculation: unique workout dates, sorted
  const dateSet = new Set(finished.map(w => toDateStr(w.startedAt)))
  const dates = [...dateSet].sort()

  let longestStreak = 0
  let run = 0
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(dates[i - 1] + 'T12:00:00')
      const cur  = new Date(dates[i]     + 'T12:00:00')
      run = Math.round((cur.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1
    }
    if (run > longestStreak) longestStreak = run
  }

  let currentStreak = 0
  if (dates.length > 0) {
    const today = toDateStr(Date.now())
    const yesterday = toDateStr(Date.now() - 86_400_000)
    const last = dates[dates.length - 1]
    if (last === today || last === yesterday) {
      let streak = 1
      for (let i = dates.length - 2; i >= 0; i--) {
        const a = new Date(dates[i]     + 'T12:00:00')
        const b = new Date(dates[i + 1] + 'T12:00:00')
        if (Math.round((b.getTime() - a.getTime()) / 86_400_000) === 1) streak++
        else break
      }
      currentStreak = streak
    }
  }

  // PR count: each time a new all-time e1RM is set for an exercise
  const EPS = 1e-6
  const scoring = (await db.sets.toArray()).filter(
    s => s.deletedAt === null && s.completedAt != null && s.weight > 0 && s.reps > 0
  )
  scoring.sort((a, b) => (a.completedAt as number) - (b.completedAt as number))
  const best = new Map<string, number>()
  let prCount = 0
  for (const s of scoring) {
    const e = estimate1RM(s.weight, s.reps)
    const prev = best.get(s.exerciseUuid) ?? 0
    if (e > prev + EPS) { best.set(s.exerciseUuid, e); prCount++ }
  }

  const totalVolumeKg = scoring.reduce((sum, s) => sum + s.weight * s.reps, 0)

  return { workoutCount, longestStreak, currentStreak, prCount, totalVolumeKg }
}

export function getEarnedBadgeIds(stats: AchievementStats): Set<string> {
  const e = new Set<string>()
  const { workoutCount, longestStreak, prCount, totalVolumeKg } = stats

  if (workoutCount >= 1)   e.add('first_workout')
  if (workoutCount >= 10)  e.add('workouts_10')
  if (workoutCount >= 25)  e.add('workouts_25')
  if (workoutCount >= 50)  e.add('workouts_50')
  if (workoutCount >= 100) e.add('workouts_100')

  if (longestStreak >= 7)   e.add('streak_7')
  if (longestStreak >= 30)  e.add('streak_30')
  if (longestStreak >= 100) e.add('streak_100')

  if (prCount >= 1)  e.add('first_pr')
  if (prCount >= 10) e.add('prs_10')
  if (prCount >= 25) e.add('prs_25')

  if (totalVolumeKg >= 10_000)  e.add('volume_10k')
  if (totalVolumeKg >= 50_000)  e.add('volume_50k')
  if (totalVolumeKg >= 100_000) e.add('volume_100k')

  return e
}
