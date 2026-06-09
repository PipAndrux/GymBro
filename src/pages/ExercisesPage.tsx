import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Search, Dumbbell, Star, Info } from 'lucide-react'
import { db } from '../db'
import type { Exercise, MuscleGroup, Equipment } from '../types'
import { MUSCLE_FILTERS, EQUIPMENT_FILTERS, MUSCLE_COLORS } from '../lib/exerciseMeta'
import BottomSheet from '../components/BottomSheet'
import AddExerciseForm from '../components/AddExerciseForm'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, onInfo }: { exercise: Exercise; onInfo: () => void }) {
  const color = MUSCLE_COLORS[exercise.primaryMuscle]
  return (
    <div style={rowStyle}>
      <div style={{ width: 3, borderRadius: 2, backgroundColor: color, flexShrink: 0, alignSelf: 'stretch' }} />
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
          <span style={{ ...chipStyle, backgroundColor: `${color}22`, color }}>{exercise.primaryMuscle}</span>
          <span style={{ ...chipStyle, backgroundColor: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text-muted))' }}>
            {exercise.equipment}
          </span>
        </div>
      </div>
      <button
        className="icon-btn"
        style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }}
        onClick={e => { e.stopPropagation(); onInfo() }}
        aria-label={`info for ${exercise.name}`}
      >
        <Info size={16} />
      </button>
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
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<'all' | MuscleGroup>('all')
  const [equipFilter, setEquipFilter] = useState<'all' | Equipment>('all')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)

  // Live list — automatically reflects newly added custom exercises.
  const exercises =
    useLiveQuery(() => db.exercises.filter(ex => ex.deletedAt === null).sortBy('name'), [], [] as Exercise[]) ?? []

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
            filtered.map(ex => <ExerciseRow key={ex.uuid} exercise={ex} onInfo={() => setDetailExercise(ex)} />)
          )}
        </div>
      </div>

      <BottomSheet open={showAddSheet} onClose={() => setShowAddSheet(false)} title="New Custom Exercise">
        <AddExerciseForm onSaved={() => setShowAddSheet(false)} onCancel={() => setShowAddSheet(false)} />
      </BottomSheet>

      <ExerciseDetailSheet
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
        exercise={detailExercise}
      />
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
