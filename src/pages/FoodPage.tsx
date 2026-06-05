import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Plus, Trash2, Target } from 'lucide-react'
import { db } from '../db'
import type { DailyGoal, Food, FoodEntry, MealType } from '../types'
import { macrosForGrams, todayStr, offsetDate, formatDateDisplay, DEFAULT_GOALS, type MacroResult } from '../lib/foodCalc'
import LogFoodSheet from '../components/LogFoodSheet'
import BottomSheet from '../components/BottomSheet'

const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

interface DayData {
  entries: FoodEntry[]
  foodMap: Record<string, Food>
  goal: DailyGoal | undefined
}

export default function FoodPage() {
  const [dateStr, setDateStr] = useState(todayStr)
  const [logMeal, setLogMeal] = useState<MealType | null>(null)
  const [editGoalsOpen, setEditGoalsOpen] = useState(false)

  const data = useLiveQuery(async (): Promise<DayData> => {
    const entries = await db.foodEntries
      .where('date')
      .equals(dateStr)
      .filter(e => e.deletedAt === null)
      .toArray()
    const uuids = [...new Set(entries.map(e => e.foodUuid))]
    const foods = await db.foods.bulkGet(uuids)
    const foodMap: Record<string, Food> = {}
    foods.forEach(f => { if (f && !f.deletedAt) foodMap[f.uuid] = f })
    const goal = await db.dailyGoals
      .where('date')
      .equals(dateStr)
      .filter(g => g.deletedAt === null)
      .first()
    return { entries, foodMap, goal }
  }, [dateStr])

  // Totals
  const totals: MacroResult = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  if (data) {
    for (const e of data.entries) {
      const food = data.foodMap[e.foodUuid]
      if (!food) continue
      const m = macrosForGrams(food, e.grams)
      totals.calories += m.calories
      totals.protein += Math.round(m.protein * 10) / 10
      totals.carbs += Math.round(m.carbs * 10) / 10
      totals.fat += Math.round(m.fat * 10) / 10
    }
  }

  const goal = data?.goal ?? null
  const calGoal = goal?.calorieGoal ?? DEFAULT_GOALS.calorieGoal
  const protGoal = goal?.proteinGoal ?? DEFAULT_GOALS.proteinGoal
  const carbGoal = goal?.carbGoal ?? DEFAULT_GOALS.carbGoal
  const fatGoal = goal?.fatGoal ?? DEFAULT_GOALS.fatGoal

  return (
    <div className="page-content">
      {/* Date switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Food</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="icon-btn" onClick={() => setDateStr(d => offsetDate(d, -1))} aria-label="previous day">
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
            {formatDateDisplay(dateStr)}
          </span>
          <button
            className="icon-btn"
            onClick={() => setDateStr(d => offsetDate(d, 1))}
            aria-label="next day"
            disabled={dateStr >= todayStr()}
            style={{ opacity: dateStr >= todayStr() ? 0.3 : 1 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Daily summary card */}
      <div style={{ padding: '8px 16px 0' }}>
        <div className="card" style={{ padding: 16 }}>
          {/* Calories */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
              {totals.calories.toLocaleString()}
            </span>
            <span style={{ fontSize: 15, color: 'rgb(var(--color-text-muted))' }}>
              / {calGoal.toLocaleString()} kcal
            </span>
          </div>
          <ProgressBar value={totals.calories} max={calGoal} color="rgb(var(--color-accent))" />

          {/* Macros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            <MacroBar label="Protein" value={totals.protein} goal={protGoal} color="#3b82f6" unit="g" />
            <MacroBar label="Carbs" value={totals.carbs} goal={carbGoal} color="#f97316" unit="g" />
            <MacroBar label="Fat" value={totals.fat} goal={fatGoal} color="#eab308" unit="g" />
          </div>

          <button
            className="btn btn-ghost"
            style={{ marginTop: 12, padding: '4px 0', fontSize: 13, gap: 5, color: 'rgb(var(--color-text-muted))' }}
            onClick={() => setEditGoalsOpen(true)}
          >
            <Target size={14} /> Edit goals
          </button>
        </div>
      </div>

      {/* Meal sections */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MEALS.map(({ type, label }) => {
          const mealEntries = data?.entries.filter(e => e.mealType === type) ?? []
          const mealKcal = mealEntries.reduce((sum, e) => {
            const food = data?.foodMap[e.foodUuid]
            return sum + (food ? macrosForGrams(food, e.grams).calories : 0)
          }, 0)
          return (
            <div key={type} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mealEntries.length > 0 ? 10 : 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
                  {mealKcal > 0 ? `${mealKcal} kcal` : ''}
                </span>
              </div>

              {mealEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                  {mealEntries.map(entry => {
                    const food = data?.foodMap[entry.foodUuid]
                    if (!food) return null
                    const m = macrosForGrams(food, entry.grams)
                    return (
                      <div key={entry.uuid} style={entryRowStyle}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{food.name}</span>
                          {food.brand && (
                            <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginLeft: 4 }}>
                              {food.brand}
                            </span>
                          )}
                          <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 1 }}>
                            {entry.grams}g · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{m.calories} kcal</span>
                          <button
                            className="icon-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => void softDeleteEntry(entry.uuid)}
                            aria-label="delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                className="add-set"
                onClick={() => setLogMeal(type)}
              >
                <Plus size={16} /> Add food
              </button>
            </div>
          )
        })}
      </div>

      {/* Log food sheet */}
      <LogFoodSheet
        open={logMeal !== null}
        onClose={() => setLogMeal(null)}
        date={dateStr}
        mealType={logMeal ?? 'breakfast'}
        onLogged={() => setLogMeal(null)}
      />

      {/* Edit goals sheet */}
      {editGoalsOpen && (
        <EditGoalsSheet
          date={dateStr}
          goal={goal}
          onClose={() => setEditGoalsOpen(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div style={{ height: 8, borderRadius: 4, background: 'rgb(var(--color-surface-2))', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          borderRadius: 4,
          background: color,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

function MacroBar({ label, value, goal, color, unit }: { label: string; value: number; goal: number; color: string; unit: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))' }}>
          {value}/{goal}{unit}
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  )
}

interface EditGoalsProps {
  date: string
  goal: DailyGoal | undefined | null
  onClose: () => void
}

function EditGoalsSheet({ date, goal, onClose }: EditGoalsProps) {
  const [cal, setCal] = useState(String(goal?.calorieGoal ?? DEFAULT_GOALS.calorieGoal))
  const [prot, setProt] = useState(String(goal?.proteinGoal ?? DEFAULT_GOALS.proteinGoal))
  const [carb, setCarb] = useState(String(goal?.carbGoal ?? DEFAULT_GOALS.carbGoal))
  const [fat, setFat] = useState(String(goal?.fatGoal ?? DEFAULT_GOALS.fatGoal))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const now = Date.now()
      const record: DailyGoal = {
        uuid: goal?.uuid ?? crypto.randomUUID(),
        date,
        calorieGoal: parseFloat(cal) || DEFAULT_GOALS.calorieGoal,
        proteinGoal: parseFloat(prot) || DEFAULT_GOALS.proteinGoal,
        carbGoal: parseFloat(carb) || DEFAULT_GOALS.carbGoal,
        fatGoal: parseFloat(fat) || DEFAULT_GOALS.fatGoal,
        updatedAt: now,
        deletedAt: null,
      }
      await db.dailyGoals.put(record)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={true} onClose={onClose} title="Daily Goals">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Calories (kcal)</label>
            <input className="input" type="number" inputMode="numeric" value={cal} onChange={e => setCal(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Protein (g)</label>
            <input className="input" type="number" inputMode="numeric" value={prot} onChange={e => setProt(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Carbs (g)</label>
            <input className="input" type="number" inputMode="numeric" value={carb} onChange={e => setCarb(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Fat (g)</label>
            <input className="input" type="number" inputMode="numeric" value={fat} onChange={e => setFat(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Goals'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// Module-level helper — outside render scope so Date.now() isn't flagged as impure-in-render
async function softDeleteEntry(uuid: string) {
  const now = Date.now()
  await db.foodEntries.update(uuid, { deletedAt: now, updatedAt: now })
}

const entryRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  paddingTop: 8,
  paddingBottom: 8,
  borderTop: '1px solid rgb(var(--color-border))',
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
