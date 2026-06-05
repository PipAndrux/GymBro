import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, BookOpen, History, Flame, ChevronRight, Check, Apple } from 'lucide-react'
import { db } from '../db'
import { useSession } from '../store/sessionStore'
import { useSettings } from '../lib/settings'
import { macrosForGrams, todayStr, DEFAULT_GOALS } from '../lib/foodCalc'
import { formatDurationShort, formatVolume, formatDateLong } from '../lib/format'
import type { Food } from '../types'

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const PLACEHOLDER_WEEK = DAY_LABELS.map(dayLabel => ({
  date: '', hasWorkout: false, dayLabel, isToday: false,
}))

export default function WorkoutPage() {
  const navigate = useNavigate()
  const hydrated = useSession(s => s.hydrated)
  const workout = useSession(s => s.workout)
  const exercises = useSession(s => s.exercises)
  const startWorkout = useSession(s => s.startWorkout)
  const { units } = useSettings()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = todayStr()

  // ── Today's food data ──────────────────────────────────────
  const todayFood = useLiveQuery(async () => {
    const entries = await db.foodEntries
      .where('date').equals(today)
      .filter(e => e.deletedAt === null)
      .toArray()
    const uuids = [...new Set(entries.map(e => e.foodUuid))]
    const foods = await db.foods.bulkGet(uuids)
    const foodMap: Record<string, Food> = {}
    foods.forEach(f => { if (f && !f.deletedAt) foodMap[f.uuid] = f })
    const goal = await db.dailyGoals
      .where('date').equals(today)
      .filter(g => g.deletedAt === null)
      .first()
    return { entries, foodMap, goal }
  }, [today])

  const totals = useMemo(() => {
    if (!todayFood) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    let cal = 0, prot = 0, carbs = 0, fat = 0
    for (const e of todayFood.entries) {
      const food = todayFood.foodMap[e.foodUuid]
      if (!food) continue
      const m = macrosForGrams(food, e.grams)
      cal += m.calories; prot += m.protein; carbs += m.carbs; fat += m.fat
    }
    return {
      calories: Math.round(cal),
      protein: Math.round(prot * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    }
  }, [todayFood])

  const calGoal  = todayFood?.goal?.calorieGoal  ?? DEFAULT_GOALS.calorieGoal
  const protGoal = todayFood?.goal?.proteinGoal  ?? DEFAULT_GOALS.proteinGoal
  const carbGoal = todayFood?.goal?.carbGoal     ?? DEFAULT_GOALS.carbGoal
  const fatGoal  = todayFood?.goal?.fatGoal      ?? DEFAULT_GOALS.fatGoal

  // ── Workout streak + week activity ─────────────────────────
  const workoutActivity = useLiveQuery(async () => {
    const workouts = await db.workouts
      .filter(w => w.status === 'finished' && w.deletedAt === null)
      .toArray()
    const workoutDateSet = new Set(workouts.map(w => localDateStr(new Date(w.startedAt))))

    const now = new Date()
    const todayD = localDateStr(now)

    // Streak: count consecutive days backward; today counts if has workout
    let streak = 0
    const startFrom = workoutDateSet.has(todayD) ? 0 : 1
    for (let i = startFrom; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      if (workoutDateSet.has(localDateStr(d))) streak++
      else break
    }

    // This week Mon–Sun
    const dayOfWeek = now.getDay() // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() + mondayOffset + i)
      const ds = localDateStr(d)
      return { date: ds, hasWorkout: workoutDateSet.has(ds), dayLabel: DAY_LABELS[i], isToday: ds === todayD }
    })

    return { streak, week }
  }, [])

  // ── Last workout ───────────────────────────────────────────
  const lastWorkout = useLiveQuery(async () => {
    const workouts = await db.workouts
      .filter(w => w.status === 'finished' && w.deletedAt === null)
      .toArray()
    if (!workouts.length) return null
    workouts.sort((a, b) => b.startedAt - a.startedAt)
    const w = workouts[0]
    const sets = await db.sets
      .where('workoutUuid').equals(w.uuid)
      .filter(s => s.deletedAt === null)
      .toArray()
    const volume = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
    return { workout: w, volume, setCount: sets.length, duration: (w.endedAt ?? w.startedAt) - w.startedAt }
  }, [])

  async function handleStart() {
    await startWorkout([])
    navigate('/session')
  }

  return (
    <div className="page-content">
      {/* Greeting */}
      <div style={{ padding: '20px 16px 4px' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>{greeting}</p>
        <h1 style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }}>GymBro</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 0' }}>

        {/* ─── Calories card ───────────────────────────────── */}
        <div className="card" style={{ padding: 16 }}>
          <div style={sectionLabel}>Today's Nutrition</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {totals.calories.toLocaleString()}
            </span>
            <span style={{ fontSize: 15, color: 'rgb(var(--color-text-muted))' }}>
              / {calGoal.toLocaleString()} kcal
            </span>
          </div>
          <ProgressBar value={totals.calories} max={calGoal} color="rgb(var(--color-accent))" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
            <MacroStat label="Protein" value={totals.protein} goal={protGoal} color="#3b82f6" />
            <MacroStat label="Carbs"   value={totals.carbs}   goal={carbGoal} color="#f97316" />
            <MacroStat label="Fat"     value={totals.fat}     goal={fatGoal}  color="#eab308" />
          </div>
        </div>

        {/* ─── Streak + week ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
          {/* Streak */}
          <div className="card" style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Flame
              size={26}
              strokeWidth={2}
              style={{ color: (workoutActivity?.streak ?? 0) > 0 ? '#f97316' : 'rgb(var(--color-border))' }}
            />
            <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {workoutActivity?.streak ?? 0}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgb(var(--color-text-muted))', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
              day streak
            </span>
          </div>

          {/* Week dots */}
          <div className="card" style={{ padding: '14px 12px' }}>
            <div style={sectionLabel}>This Week</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
              {(workoutActivity?.week ?? PLACEHOLDER_WEEK).map((day, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: day.hasWorkout
                      ? 'rgb(var(--color-accent))'
                      : day.isToday
                        ? 'rgba(34 197 94 / 0.12)'
                        : 'rgb(var(--color-surface-2))',
                    border: day.isToday && !day.hasWorkout
                      ? '1.5px solid rgba(34 197 94 / 0.5)'
                      : '1.5px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {day.hasWorkout && <Check size={14} color="#fff" strokeWidth={2.5} />}
                  </div>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: day.isToday ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
                  }}>
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Quick actions ───────────────────────────────── */}
        {hydrated && workout ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: 17, borderRadius: 'var(--radius-lg)', flexDirection: 'column', gap: 3 }}
            onClick={() => navigate('/session')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={20} /> Resume Workout
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · in progress
            </span>
          </button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ padding: '16px', fontSize: 16, borderRadius: 'var(--radius-lg)', justifyContent: 'flex-start', gap: 10 }}
              onClick={handleStart}
            >
              <Plus size={20} /> Start Workout
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '16px 10px', fontSize: 14, borderRadius: 'var(--radius-lg)', flexDirection: 'column', gap: 4 }}
              onClick={() => navigate('/food')}
            >
              <Apple size={18} style={{ color: 'rgb(var(--color-accent))' }} />
              Log Food
            </button>
          </div>
        )}

        {/* ─── Last workout card ───────────────────────────── */}
        {lastWorkout && (
          <button
            className="card nav-card"
            style={{ padding: '14px 16px' }}
            onClick={() => navigate('/history')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={sectionLabel}>Last Workout</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{lastWorkout.workout.name}</div>
              <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
                {formatDateLong(lastWorkout.workout.startedAt)}
                {' · '}{formatDurationShort(lastWorkout.duration)}
                {' · '}{formatVolume(lastWorkout.volume, units)}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
          </button>
        )}

        {/* ─── Library + History nav cards ─────────────────── */}
        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/exercises')}>
          <div style={iconWrap}>
            <BookOpen size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Exercise Library</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Browse and add custom exercises
            </div>
          </div>
        </button>

        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/history')}>
          <div style={{ ...iconWrap, background: 'rgba(34 197 94 / 0.08)' }}>
            <History size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Workout History</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Review past workouts and volume
            </div>
          </div>
        </button>

      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div style={{ height: 7, borderRadius: 4, background: 'rgb(var(--color-surface-2))', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 4, background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function MacroStat({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
          {value}<span style={{ opacity: 0.6 }}>/{goal}g</span>
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgb(var(--color-text-muted))',
  marginBottom: 8,
}

const iconWrap: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 'var(--radius-md)',
  background: 'rgba(34 197 94 / 0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
