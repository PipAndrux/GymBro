import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Dumbbell, Star } from 'lucide-react'
import { db } from '../db'
import type { Exercise, MuscleGroup, Equipment, Category } from '../types'
import BottomSheet from '../components/BottomSheet'

// ─── Filter config ────────────────────────────────────────────────────────────

const MUSCLE_FILTERS: { label: string; value: 'all' | MuscleGroup }[] = [
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

const EQUIPMENT_FILTERS: { label: string; value: 'all' | Equipment }[] = [
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

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
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

// ─── Add Exercise Form ────────────────────────────────────────────────────────

interface AddExerciseFormProps {
  onSave: () => void
  onCancel: () => void
}

function AddExerciseForm({ onSave, onCancel }: AddExerciseFormProps) {
  const [name, setName] = useState('')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [category, setCategory] = useState<Category>('strength')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Exercise name is required.'); return }
    setSaving(true)
    await db.exercises.add({
      uuid: crypto.randomUUID(),
      name: name.trim(),
      primaryMuscle,
      secondaryMuscles: [],
      equipment,
      category,
      isCustom: true,
      updatedAt: Date.now(),
      deletedAt: null,
    })
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Exercise Name *</label>
        <input
          className="input"
          placeholder="e.g. Cable Fly"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          autoFocus
        />
        {error && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#ef4444' }}>{error}</p>}
      </div>

      <div>
        <label style={labelStyle}>Primary Muscle</label>
        <select
          className="input"
          value={primaryMuscle}
          onChange={e => setPrimaryMuscle(e.target.value as MuscleGroup)}
          style={{ cursor: 'pointer' }}
        >
          {MUSCLE_FILTERS.slice(1).map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Equipment</label>
        <select
          className="input"
          value={equipment}
          onChange={e => setEquipment(e.target.value as Equipment)}
          style={{ cursor: 'pointer' }}
        >
          {EQUIPMENT_FILTERS.slice(1).map(eq => (
            <option key={eq.value} value={eq.value}>{eq.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['strength', 'cardio'] as Category[]).map(c => (
            <button
              key={c}
              type="button"
              className={`btn ${category === c ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, textTransform: 'capitalize' }}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Exercise'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const color = MUSCLE_COLORS[exercise.primaryMuscle]
  return (
    <div style={rowStyle}>
      <div
        style={{
          width: 3,
          borderRadius: 2,
          backgroundColor: color,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'rgb(var(--color-text))', lineHeight: 1.3 }}>
            {exercise.name}
          </span>
          {exercise.isCustom && (
            <Star size={12} style={{ color: 'rgb(var(--color-accent))', flexShrink: 0 }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ ...chipStyle, backgroundColor: `${color}22`, color }}>
            {exercise.primaryMuscle}
          </span>
          <span style={{ ...chipStyle, backgroundColor: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text-muted))' }}>
            {exercise.equipment}
          </span>
        </div>
      </div>
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: 12,
  padding: '12px 16px',
  borderBottom: '1px solid rgb(var(--color-border))',
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 7px',
  borderRadius: 100,
  textTransform: 'capitalize',
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<'all' | MuscleGroup>('all')
  const [equipFilter, setEquipFilter] = useState<'all' | Equipment>('all')
  const [showAddSheet, setShowAddSheet] = useState(false)

  const loadExercises = useCallback(async () => {
    const all = await db.exercises
      .filter(ex => ex.deletedAt === null)
      .sortBy('name')
    setExercises(all)
  }, [])

  useEffect(() => { loadExercises() }, [loadExercises])

  const filtered = exercises.filter(ex => {
    if (muscleFilter !== 'all' && ex.primaryMuscle !== muscleFilter) return false
    if (equipFilter !== 'all' && ex.equipment !== equipFilter) return false
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const customCount = exercises.filter(ex => ex.isCustom).length

  return (
    <>
      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Sub-page header */}
        <div style={stickyHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 'var(--safe-top)' }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '8px 4px', marginLeft: -4 }}
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700 }}>
              Exercises
              {customCount > 0 && (
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgb(var(--color-text-muted))', marginLeft: 8 }}>
                  +{customCount} custom
                </span>
              )}
            </h1>
            <button
              className="btn btn-primary"
              style={{ padding: '8px 14px', borderRadius: 100 }}
              onClick={() => setShowAddSheet(true)}
            >
              <Plus size={18} />
              <span>Add</span>
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginTop: 10 }}>
            <Search size={16} style={searchIconStyle} />
            <input
              className="input"
              placeholder="Search exercises…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Muscle filter chips */}
          <div style={filterRowStyle}>
            {MUSCLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setMuscleFilter(f.value)}
                style={{
                  ...filterChipStyle,
                  backgroundColor: muscleFilter === f.value ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface-2))',
                  color: muscleFilter === f.value ? '#fff' : 'rgb(var(--color-text))',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Equipment filter chips */}
          <div style={filterRowStyle}>
            {EQUIPMENT_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setEquipFilter(f.value)}
                style={{
                  ...filterChipStyle,
                  backgroundColor: equipFilter === f.value ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface-2))',
                  color: equipFilter === f.value ? '#fff' : 'rgb(var(--color-text))',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <p style={{ margin: '8px 16px 0', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
            {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Exercise list */}
        <div style={{ background: 'rgb(var(--color-surface))', margin: '8px 16px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid rgb(var(--color-border))' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Dumbbell size={36} strokeWidth={1.5} />
              <p>{search || muscleFilter !== 'all' || equipFilter !== 'all' ? 'No exercises match your filters.' : 'No exercises found.'}</p>
            </div>
          ) : (
            filtered.map(ex => <ExerciseRow key={ex.uuid} exercise={ex} />)
          )}
        </div>
      </div>

      <BottomSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="New Custom Exercise"
      >
        <AddExerciseForm
          onSave={() => { setShowAddSheet(false); loadExercises() }}
          onCancel={() => setShowAddSheet(false)}
        />
      </BottomSheet>
    </>
  )
}

const stickyHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  paddingBottom: 8,
  borderBottom: '1px solid rgb(var(--color-border))',
  padding: '0 16px 8px',
}

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: 'rgb(var(--color-text-muted))',
  pointerEvents: 'none',
}

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  paddingBottom: 4,
  marginTop: 8,
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
} as React.CSSProperties

const filterChipStyle: React.CSSProperties = {
  flexShrink: 0,
  border: 'none',
  borderRadius: 100,
  padding: '5px 12px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
}
