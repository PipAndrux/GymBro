import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { db } from '../db'
import type { Food, Recipe, RecipeIngredient } from '../types'
import { macrosForGrams } from '../lib/foodCalc'

interface Props {
  open: boolean
  onClose: () => void
  editRecipe?: Recipe | null
  onSaved?: (recipe: Recipe) => void
}

function calcTotals(ingredients: RecipeIngredient[], foodMap: Record<string, Food>) {
  let cal = 0, prot = 0, carbs = 0, fat = 0, totalGrams = 0
  for (const ing of ingredients) {
    const food = foodMap[ing.foodUuid]
    if (!food || ing.grams <= 0) continue
    const m = macrosForGrams(food, ing.grams)
    cal += m.calories; prot += m.protein; carbs += m.carbs; fat += m.fat
    totalGrams += ing.grams
  }
  return { cal, prot, carbs, fat, totalGrams }
}

export default function RecipeBuilderSheet({ open, onClose, editRecipe, onSaved }: Props) {
  const [name, setName] = useState(editRecipe?.name ?? '')
  const [servings, setServings] = useState(String(editRecipe?.servings ?? 2))
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(editRecipe?.ingredients ?? [])
  const [foodSearch, setFoodSearch] = useState('')
  const [addingIngredient, setAddingIngredient] = useState(false)
  const [pickedFood, setPickedFood] = useState<Food | null>(null)
  const [gramsStr, setGramsStr] = useState('100')
  const [saving, setSaving] = useState(false)

  const allFoods = useLiveQuery(() => db.foods.filter(f => !f.deletedAt).sortBy('name'), []) ?? []
  const foodMap: Record<string, Food> = Object.fromEntries(allFoods.map(f => [f.uuid, f]))

  const filtered = foodSearch
    ? allFoods.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : allFoods

  const servingsNum = Math.max(1, parseFloat(servings) || 1)
  const { cal, prot, carbs, fat, totalGrams } = calcTotals(ingredients, foodMap)
  const servingGrams = Math.round(totalGrams / servingsNum)
  const perServing = {
    cal: Math.round(cal / servingsNum),
    prot: Math.round(prot / servingsNum * 10) / 10,
    carbs: Math.round(carbs / servingsNum * 10) / 10,
    fat: Math.round(fat / servingsNum * 10) / 10,
  }

  function addIngredient() {
    if (!pickedFood) return
    const g = parseFloat(gramsStr)
    if (isNaN(g) || g <= 0) return
    setIngredients(prev => [...prev, { foodUuid: pickedFood.uuid, grams: g }])
    setPickedFood(null); setFoodSearch(''); setGramsStr('100'); setAddingIngredient(false)
  }

  function removeIngredient(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!name.trim() || ingredients.length === 0) return
    setSaving(true)
    try {
      const now = Date.now()
      const uuid = editRecipe?.uuid ?? crypto.randomUUID()
      const recipe: Recipe = { uuid, name: name.trim(), servings: servingsNum, ingredients, updatedAt: now, deletedAt: null }
      await db.recipes.put(recipe)

      // Mirror recipe as a Food entry so it appears in the food picker
      if (totalGrams > 0) {
        const mirrorFood: Food = {
          uuid: `recipe-${uuid}`,
          name: recipe.name,
          brand: `Recipe · ${servingsNum} serving${servingsNum !== 1 ? 's' : ''}`,
          caloriesPer100g: Math.round(cal * 100 / totalGrams),
          protein: Math.round(prot * 100 / totalGrams * 10) / 10,
          carbs: Math.round(carbs * 100 / totalGrams * 10) / 10,
          fat: Math.round(fat * 100 / totalGrams * 10) / 10,
          isCustom: true,
          updatedAt: now,
          deletedAt: null,
        }
        await db.foods.put(mirrorFood)
      }

      onSaved?.(recipe)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editRecipe ? 'Edit Recipe' : 'New Recipe'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Recipe name</label>
          <input className="input" placeholder="e.g. Protein Oats" value={name} onChange={e => setName(e.target.value)} autoFocus={!editRecipe} />
        </div>
        <div>
          <label style={lbl}>Servings</label>
          <input className="input" inputMode="decimal" value={servings} onChange={e => setServings(e.target.value)} style={{ width: 80 }} />
        </div>

        {/* Ingredients */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8 }}>
            Ingredients ({ingredients.length})
          </div>
          {ingredients.map((ing, idx) => {
            const food = foodMap[ing.foodUuid]
            const m = food ? macrosForGrams(food, ing.grams) : null
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid rgb(var(--color-border))' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{food?.name ?? 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>{ing.grams}g · {m?.calories ?? 0} kcal</div>
                </div>
                <button className="icon-btn" onClick={() => removeIngredient(idx)}><Trash2 size={14} /></button>
              </div>
            )
          })}
          {!addingIngredient && (
            <button className="add-set" style={{ marginTop: 8 }} onClick={() => setAddingIngredient(true)}>
              <Plus size={16} /> Add ingredient
            </button>
          )}
        </div>

        {/* Add ingredient inline */}
        {addingIngredient && (
          <div style={{ background: 'rgb(var(--color-surface))', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid rgb(var(--color-border))' }}>
            {!pickedFood ? (
              <>
                <input
                  className="input"
                  placeholder="Search foods…"
                  value={foodSearch}
                  onChange={e => setFoodSearch(e.target.value)}
                  autoFocus
                  style={{ marginBottom: 8 }}
                />
                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filtered.slice(0, 20).map(f => (
                    <button key={f.uuid} className="pick-row" style={{ fontSize: 13 }} onClick={() => setPickedFood(f)}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{pickedFood.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" inputMode="decimal" value={gramsStr} onChange={e => setGramsStr(e.target.value)} style={{ flex: 1 }} placeholder="grams" autoFocus />
                  <span style={{ color: 'rgb(var(--color-text-muted))', fontSize: 13 }}>g</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPickedFood(null)}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={addIngredient} disabled={!gramsStr || parseFloat(gramsStr) <= 0}>Add</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Per-serving summary */}
        {ingredients.length > 0 && (
          <div style={{ background: 'rgb(var(--color-surface))', borderRadius: 'var(--radius-md)', padding: 12, border: '1px solid rgb(var(--color-border))' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-text-muted))', marginBottom: 6 }}>Per serving ({servingGrams}g)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
              {[['kcal', perServing.cal, 'rgb(var(--color-accent))'], ['P', perServing.prot, '#3b82f6'], ['C', perServing.carbs, '#f97316'], ['F', perServing.fat, '#ef4444']].map(([label, val, color]) => (
                <div key={String(label)} style={{ background: `${color}15`, borderRadius: 8, padding: '6px 4px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: String(color) }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'rgb(var(--color-text-muted))' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving || !name.trim() || ingredients.length === 0}
          >
            {saving ? 'Saving…' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgb(var(--color-text-muted))', marginBottom: 6 }
