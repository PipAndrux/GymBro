import { useState } from 'react'
import { db } from '../db'
import type { Exercise, MuscleGroup, Equipment, Category } from '../types'
import { MUSCLE_FILTERS, EQUIPMENT_FILTERS } from '../lib/exerciseMeta'

interface AddExerciseFormProps {
  /** Called with the newly created (and persisted) custom exercise. */
  onSaved: (exercise: Exercise) => void
  onCancel: () => void
}

// Shared form for creating a custom exercise — used by the Library screen and the
// in-session Add Exercise picker, so a personalized exercise can be added anywhere.
export default function AddExerciseForm({ onSaved, onCancel }: AddExerciseFormProps) {
  const [name, setName] = useState('')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [category, setCategory] = useState<Category>('strength')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) {
      setError('Exercise name is required.')
      return
    }
    setSaving(true)
    const exercise: Exercise = {
      uuid: crypto.randomUUID(),
      name: name.trim(),
      primaryMuscle,
      secondaryMuscles: [],
      equipment,
      category,
      isCustom: true,
      updatedAt: Date.now(),
      deletedAt: null,
    }
    await db.exercises.add(exercise)
    setSaving(false)
    onSaved(exercise)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Exercise Name *</label>
        <input
          className="input"
          placeholder="e.g. Cable Fly"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setError('')
          }}
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
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
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
            <option key={eq.value} value={eq.value}>
              {eq.label}
            </option>
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
