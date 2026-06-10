import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, BookOpen, History, Flame, ChevronRight, Trophy, TrendingUp, ListOrdered } from 'lucide-react'
import { db } from '../db'
import { useSession } from '../store/sessionStore'
import { useSettings } from '../lib/settings'
import { useAuth } from '../store/authStore'
import { macrosForGrams, todayStr, DEFAULT_GOALS } from '../lib/foodCalc'
import { getRecentPRs } from '../lib/prs'
import type { Food } from '../types'

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const hydrated = useSession(s => s.hydrated)
  const workout = useSession(s => s.workout)
  const startWorkout = useSession(s => s.startWorkout)
  const { units } = useSettings()
  const { user } = useAuth()

  // Recent personal records — celebratory card (live-updates as sets are logged).
  const recentPRs = useLiveQuery(() => getRecentPRs(21, 2), [], [])

  // Greeting changes by hour: morning 5–11, afternoon 12–17, evening 18–4.
  const hour = new Date().getHours()
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'

  // First name from Supabase profile/auth, or "Guest" when logged out.
  const meta = user?.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name?.trim()
  const firstName = !user
    ? 'Guest'
    : (fullName ? fullName.split(/\s+/)[0] : (user.email?.split('@')[0] || 'Guest'))

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

  // ── Workout streak (consecutive days with a finished workout) ──
  const streak = useLiveQuery(async () => {
    const workouts = await db.workouts
      .filter(w => w.status === 'finished' && w.deletedAt === null)
      .toArray()
    const workoutDateSet = new Set(workouts.map(w => localDateStr(new Date(w.startedAt))))

    const now = new Date()
    const todayD = localDateStr(now)

    let s = 0
    const startFrom = workoutDateSet.has(todayD) ? 0 : 1
    for (let i = startFrom; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      if (workoutDateSet.has(localDateStr(d))) s++
      else break
    }
    return s
  }, [], 0)

  async function handleStart() {
    await startWorkout([])
    navigate('/session')
  }

  const workoutInProgress = hydrated && workout

  return (
    <div className="page-content">
      {/* Greeting — single line: greeting left, first name right */}
      <div style={{ padding: '20px 16px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.6, whiteSpace: 'nowrap', flexShrink: 0 }}>{greeting}</h1>
        <span style={{
          fontSize: 17, fontWeight: 700, color: 'rgb(var(--color-accent))',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
        }}>
          {firstName}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 0' }}>

        {/* ─── Calories card (with compact streak top-right) ─── */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ ...sectionLabel, marginBottom: 0 }}>Today's Nutrition</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <Flame size={15} strokeWidth={2.2} style={{ color: streak > 0 ? '#f97316' : 'rgb(var(--color-border))' }} />
              <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{streak}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgb(var(--color-text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Day Streak
              </span>
            </div>
          </div>
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
            <MacroStat label="Fat"     value={totals.fat}     goal={fatGoal}  color="#ef4444" />
          </div>
        </div>

        {/* ─── Start/Resume + Routines (side by side) ───────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ padding: '16px 12px', fontSize: 15, borderRadius: 'var(--radius-lg)', gap: 8 }}
            onClick={workoutInProgress ? () => navigate('/session') : handleStart}
          >
            {workoutInProgress ? <><Play size={18} /> Resume Workout</> : <><Plus size={18} /> Start Workout</>}
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '16px 12px', fontSize: 15, borderRadius: 'var(--radius-lg)', gap: 8 }}
            onClick={() => navigate('/routines')}
          >
            <ListOrdered size={18} /> Routines
          </button>
        </div>

        {/* ─── Recent PR celebration ───────────────────────── */}
        {recentPRs.length > 0 && (
          <button
            className="card"
            style={{
              padding: '13px 15px', textAlign: 'left', cursor: 'pointer', width: '100%',
              border: '1px solid rgba(245 158 11 / 0.4)',
              background: 'linear-gradient(100deg, rgba(245 158 11 / 0.12), rgb(var(--color-surface)))',
            }}
            onClick={() => navigate(`/progress/${recentPRs[0].exerciseUuid}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy size={22} style={{ color: 'rgb(var(--color-accent-amber))', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-accent-amber))' }}>
                  {recentPRs.length > 1 ? `${recentPRs.length} New PRs` : 'New PR'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recentPRs[0].exerciseName} — {recentPRs[0].weight}{units} × {recentPRs[0].reps}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
            </div>
          </button>
        )}

        {/* ─── Progress + Library + History nav cards ──────── */}
        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/progress')}>
          <div style={{ ...iconWrap, background: 'rgba(34 197 94 / 0.12)' }}>
            <TrendingUp size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Progress &amp; Records</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Strength charts, volume and PRs
            </div>
          </div>
        </button>

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
