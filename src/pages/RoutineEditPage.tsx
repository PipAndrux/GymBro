import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronUp, ChevronDown, Plus, X, ListOrdered, Trash2 } from 'lucide-react'
import { db } from '../db'
import type { Exercise, Routine } from '../types'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import ExercisePicker from '../components/ExercisePicker'

export default function RoutineEditPage() {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const isEdit = !!uuid

  const [existing, setExisting] = useState<Routine | null>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Exercise[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')

  // Load the routine when editing.
  useEffect(() => {
    if (!uuid) return
    let cancelled = false
    ;(async () => {
      const r = await db.routines.get(uuid)
      if (!r || r.deletedAt !== null) return
      const exs = (await Promise.all(r.exerciseOrder.map(id => db.exercises.get(id)))).filter(
        (e): e is Exercise => !!e && e.deletedAt === null
      )
      if (cancelled) return
      setExisting(r)
      setName(r.name)
      setNotes(r.notes ?? '')
      setItems(exs)
    })()
    return () => {
      cancelled = true
    }
  }, [uuid])

  function move(index: number, dir: -1 | 1) {
    setItems(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeAt(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addExercises(selected: Exercise[]) {
    setPickerOpen(false)
    setItems(prev => {
      const have = new Set(prev.map(e => e.uuid))
      return [...prev, ...selected.filter(e => !have.has(e.uuid))]
    })
  }

  async function save() {
    if (!name.trim()) {
      setError('Routine name is required.')
      return
    }
    if (items.length === 0) {
      setError('Add at least one exercise.')
      return
    }
    const now = Date.now()
    const routine: Routine = {
      uuid: existing?.uuid ?? crypto.randomUUID(),
      name: name.trim(),
      exerciseOrder: items.map(e => e.uuid),
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.routines.put(routine)
    navigate('/routines')
  }

  async function remove() {
    if (!existing) return
    await db.routines.update(existing.uuid, { deletedAt: Date.now(), updatedAt: Date.now() })
    navigate('/routines')
  }

  return (
    <>
      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ paddingTop: 'var(--safe-top)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '8px 4px', marginLeft: -4 }}
              onClick={() => navigate('/routines')}
              aria-label="back"
            >
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700 }}>
              {isEdit ? 'Edit Routine' : 'New Routine'}
            </h1>
            <button className="btn btn-primary" style={{ padding: '10px 18px' }} onClick={save}>
              Save
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Routine Name *</label>
            <input
              className="input"
              placeholder="e.g. Push Day"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setError('')
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <input
              className="input"
              placeholder="e.g. Focus on slow eccentrics"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Exercises ({items.length})</label>
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <ListOrdered size={36} strokeWidth={1.5} />
                <p>No exercises yet. Add some and arrange the order.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((ex, i) => {
                  const color = MUSCLE_COLORS[ex.primaryMuscle]
                  return (
                    <div key={ex.uuid} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          className="reorder-btn"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          className="reorder-btn"
                          onClick={() => move(i, 1)}
                          disabled={i === items.length - 1}
                          aria-label="move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--color-text-muted))', minWidth: 16 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '1px 7px',
                            borderRadius: 100,
                            textTransform: 'capitalize',
                            background: `${color}22`,
                            color,
                          }}
                        >
                          {ex.primaryMuscle}
                        </span>
                      </div>
                      <button className="icon-btn" onClick={() => removeAt(i)} aria-label="remove exercise">
                        <X size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => setPickerOpen(true)}>
              <Plus size={18} /> Add Exercise
            </button>
          </div>

          {error && <p style={{ margin: 0, fontSize: 14, color: '#ef4444', textAlign: 'center' }}>{error}</p>}

          {isEdit && (
            <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', marginTop: 4 }} onClick={remove}>
              <Trash2 size={16} /> Delete Routine
            </button>
          )}
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addExercises}
        excludeUuids={items.map(e => e.uuid)}
        title="Add Exercises"
        confirmLabel="Add"
      />
    </>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
