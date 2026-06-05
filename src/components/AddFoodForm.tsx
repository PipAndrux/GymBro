import { useState } from 'react'
import { db } from '../db'
import type { Food } from '../types'

interface Props {
  onSaved: (food: Food) => void
  onCancel: () => void
}

interface FormState {
  name: string
  brand: string
  caloriesPer100g: string
  protein: string
  carbs: string
  fat: string
}

const EMPTY: FormState = { name: '', brand: '', caloriesPer100g: '', protein: '', carbs: '', fat: '' }

export default function AddFoodForm({ onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) { setError('Name is required.'); return }
    const cal = parseFloat(form.caloriesPer100g)
    if (isNaN(cal) || cal < 0) { setError('Enter valid calories per 100g.'); return }

    setSaving(true)
    try {
      const food: Food = {
        uuid: crypto.randomUUID(),
        name,
        brand: form.brand.trim() || undefined,
        caloriesPer100g: cal,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        isCustom: true,
        updatedAt: Date.now(),
        deletedAt: null,
      }
      await db.foods.add(food)
      onSaved(food)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={lbl}>Name *</label>
        <input
          className="input"
          placeholder="e.g. Chicken breast"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label style={lbl}>Brand (optional)</label>
        <input
          className="input"
          placeholder="e.g. Lidl"
          value={form.brand}
          onChange={e => set('brand', e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Calories / 100g *</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={form.caloriesPer100g}
            onChange={e => set('caloriesPer100g', e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>Protein (g)</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={form.protein}
            onChange={e => set('protein', e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>Carbs (g)</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={form.carbs}
            onChange={e => set('carbs', e.target.value)}
          />
        </div>
        <div>
          <label style={lbl}>Fat (g)</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={form.fat}
            onChange={e => set('fat', e.target.value)}
          />
        </div>
      </div>

      {error && <p style={{ margin: 0, color: '#ef4444', fontSize: 14 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
          Back
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Food'}
        </button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
