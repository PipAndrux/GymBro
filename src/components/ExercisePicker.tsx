import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, Check } from 'lucide-react'
import { db } from '../db'
import type { Exercise, MuscleGroup } from '../types'
import { MUSCLE_FILTERS, MUSCLE_COLORS } from '../lib/exerciseMeta'
import BottomSheet from './BottomSheet'

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onConfirm: (selected: Exercise[]) => void
  excludeUuids?: string[]
  title?: string
  confirmLabel?: string
}

export default function ExercisePicker({
  open,
  onClose,
  onConfirm,
  excludeUuids = [],
  title = 'Choose Exercises',
  confirmLabel = 'Add',
}: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState<'all' | MuscleGroup>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Live list of exercises (auto-updates if a custom exercise is added elsewhere).
  const all =
    useLiveQuery(
      () => (open ? db.exercises.filter(e => e.deletedAt === null).sortBy('name') : Promise.resolve([] as Exercise[])),
      [open],
      [] as Exercise[]
    ) ?? []

  // Reset the picker each time it opens (render-phase pattern, not an effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSelected(new Set())
      setSearch('')
      setMuscle('all')
    }
  }

  const exclude = useMemo(() => new Set(excludeUuids), [excludeUuids])

  const filtered = all.filter(ex => {
    if (exclude.has(ex.uuid)) return false
    if (muscle !== 'all' && ex.primaryMuscle !== muscle) return false
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggle(uuid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  function confirm() {
    onConfirm(all.filter(e => selected.has(e.uuid)))
    setSelected(new Set())
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgb(var(--color-text-muted))',
            pointerEvents: 'none',
          }}
        />
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </div>

      <div style={chipRow}>
        {MUSCLE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setMuscle(f.value)}
            style={{
              flexShrink: 0,
              border: 'none',
              borderRadius: 100,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              background: muscle === f.value ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface-2))',
              color: muscle === f.value ? '#fff' : 'rgb(var(--color-text))',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={listStyle}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>No exercises found.</p>
          </div>
        ) : (
          filtered.map(ex => {
            const on = selected.has(ex.uuid)
            const color = MUSCLE_COLORS[ex.primaryMuscle]
            return (
              <button
                key={ex.uuid}
                onClick={() => toggle(ex.uuid)}
                className="pick-row"
                style={{ borderColor: on ? 'rgb(var(--color-accent))' : 'transparent' }}
              >
                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ ...tag, background: `${color}22`, color }}>{ex.primaryMuscle}</span>
                    <span style={{ ...tag, background: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text-muted))' }}>
                      {ex.equipment}
                    </span>
                  </div>
                </div>
                <div className={`pick-check${on ? ' on' : ''}`}>{on && <Check size={15} />}</div>
              </button>
            )
          })
        )}
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 10 }}
        disabled={selected.size === 0}
        onClick={confirm}
      >
        {confirmLabel}
        {selected.size > 0 ? ` (${selected.size})` : ''}
      </button>
    </BottomSheet>
  )
}

const chipRow: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
  paddingBottom: 6,
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
}

const listStyle: React.CSSProperties = {
  maxHeight: '46vh',
  overflowY: 'auto',
  margin: '8px -4px 0',
  WebkitOverflowScrolling: 'touch',
}

const tag: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '1px 7px',
  borderRadius: 100,
  textTransform: 'capitalize',
}
