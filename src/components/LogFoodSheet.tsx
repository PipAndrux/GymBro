import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, ChevronLeft } from 'lucide-react'
import BottomSheet from './BottomSheet'
import AddFoodForm from './AddFoodForm'
import { db } from '../db'
import type { Food, MealType } from '../types'
import { macrosForGrams } from '../lib/foodCalc'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  mealType: MealType
  onLogged: () => void
}

type Mode = 'pick' | 'grams' | 'create'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function LogFoodSheet({ open, onClose, date, mealType, onLogged }: Props) {
  const [prevOpen, setPrevOpen] = useState(open)
  const [mode, setMode] = useState<Mode>('pick')
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [gramsStr, setGramsStr] = useState('100')
  const [saving, setSaving] = useState(false)

  // Reset state synchronously when sheet opens (render-phase prevOpen pattern — no useEffect)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMode('pick')
      setSearch('')
      setSelectedFood(null)
      setGramsStr('100')
      setSaving(false)
    }
  }

  const allFoods = useLiveQuery(() =>
    db.foods.filter(f => f.deletedAt === null).sortBy('name'),
  [])

  // Recent food UUIDs from all logged entries, deduped, most-recent first
  const recentUuids = useLiveQuery(async () => {
    const entries = await db.foodEntries
      .orderBy('updatedAt')
      .reverse()
      .filter(e => e.deletedAt === null)
      .limit(60)
      .toArray()
    const seen = new Set<string>()
    const uuids: string[] = []
    for (const e of entries) {
      if (!seen.has(e.foodUuid)) { seen.add(e.foodUuid); uuids.push(e.foodUuid) }
    }
    return uuids
  }, [])

  const sortedFoods = useMemo(() => {
    const foods = allFoods ?? []
    const recent = recentUuids ?? []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? foods.filter(f => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q))
      : foods
    return [...filtered].sort((a, b) => {
      const ai = recent.indexOf(a.uuid)
      const bi = recent.indexOf(b.uuid)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }, [allFoods, recentUuids, search])

  async function handleLog() {
    if (!selectedFood) return
    const grams = parseFloat(gramsStr)
    if (isNaN(grams) || grams <= 0) return
    setSaving(true)
    try {
      await db.foodEntries.add({
        uuid: crypto.randomUUID(),
        date,
        foodUuid: selectedFood.uuid,
        mealType,
        grams,
        updatedAt: Date.now(),
        deletedAt: null,
      })
      onLogged()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const grams = parseFloat(gramsStr)
  const preview = selectedFood && !isNaN(grams) && grams > 0
    ? macrosForGrams(selectedFood, grams)
    : null

  const sheetTitle =
    mode === 'create' ? 'New Food' :
    mode === 'grams' ? (selectedFood?.name ?? '') :
    `Add to ${MEAL_LABELS[mealType]}`

  return (
    <BottomSheet open={open} onClose={onClose} title={sheetTitle}>
      {mode === 'pick' && (
        <>
          {/* Quick-add chips: top 5 most-recently logged foods */}
          {!search && recentUuids && recentUuids.length > 0 && (() => {
            const chips = recentUuids.slice(0, 5).map(uuid => allFoods?.find(f => f.uuid === uuid)).filter(Boolean)
            if (chips.length === 0) return null
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8,
                }}>
                  Quick Add
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {chips.map(food => food && (
                    <button
                      key={food.uuid}
                      style={quickChipStyle}
                      onClick={() => { setSelectedFood(food); setMode('grams') }}
                    >
                      {food.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--color-text-muted))' }} />
            <input
              className="input"
              placeholder="Search foods…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Create new food */}
          <button
            onClick={() => setMode('create')}
            style={dashedBtn}
          >
            <Plus size={16} /> Create new food
          </button>

          {/* Food list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {sortedFoods.length === 0 && (
              <p style={{ textAlign: 'center', color: 'rgb(var(--color-text-muted))', fontSize: 14, padding: '20px 0' }}>
                {search ? 'No foods match your search.' : 'No foods yet — create your first food above.'}
              </p>
            )}
            {sortedFoods.map(food => (
              <button
                key={food.uuid}
                className="pick-row"
                onClick={() => { setSelectedFood(food); setMode('grams') }}
              >
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {food.name}
                  </div>
                  {food.brand && (
                    <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>{food.brand}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {food.caloriesPer100g} kcal / 100g
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'grams' && selectedFood && (
        <>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 0', marginBottom: 12, marginLeft: -4 }}
            onClick={() => setMode('pick')}
          >
            <ChevronLeft size={18} /> Back
          </button>

          {/* Food info */}
          <div className="card" style={{ padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>{selectedFood.caloriesPer100g} kcal</span>
              <span>P {selectedFood.protein}g</span>
              <span>C {selectedFood.carbs}g</span>
              <span>F {selectedFood.fat}g</span>
              <span style={{ color: 'rgb(var(--color-text-muted))', fontStyle: 'italic' }}>per 100g</span>
            </div>
          </div>

          {/* Grams input */}
          <label style={lbl}>Grams</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="100"
            value={gramsStr}
            onChange={e => setGramsStr(e.target.value)}
            autoFocus
            style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}
          />

          {/* Live preview */}
          {preview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              <MacroChip label="kcal" value={preview.calories} color="rgb(var(--color-accent))" />
              <MacroChip label="protein" value={preview.protein} color="#3b82f6" />
              <MacroChip label="carbs" value={preview.carbs} color="#f97316" />
              <MacroChip label="fat" value={preview.fat} color="#ef4444" />
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleLog}
            disabled={saving || !preview}
          >
            {saving ? 'Logging…' : `Log to ${MEAL_LABELS[mealType]}`}
          </button>
        </>
      )}

      {mode === 'create' && (
        <AddFoodForm
          onCancel={() => setMode('pick')}
          onSaved={food => {
            setSelectedFood(food)
            setMode('grams')
          }}
        />
      )}
    </BottomSheet>
  )
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: `${color}15`, borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const dashedBtn: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '11px',
  border: '1.5px dashed rgb(var(--color-border))',
  borderRadius: 12,
  background: 'transparent',
  color: 'rgb(var(--color-accent))',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}

const quickChipStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '7px 14px',
  borderRadius: 100,
  border: '1.5px solid rgb(var(--color-border))',
  background: 'rgb(var(--color-surface-2))',
  color: 'rgb(var(--color-text))',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  WebkitTapHighlightColor: 'transparent',
  fontFamily: 'inherit',
}
