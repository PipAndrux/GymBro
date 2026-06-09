import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search, ChevronLeft, Camera, Globe, BookOpen, Loader } from 'lucide-react'
import BottomSheet from './BottomSheet'
import AddFoodForm from './AddFoodForm'
import BarcodeScanner from './BarcodeScanner'
import { db } from '../db'
import type { Food, MealType, SavedMeal } from '../types'
import { macrosForGrams } from '../lib/foodCalc'
import { searchFoodsOnline, lookupBarcode, type OFFProduct } from '../lib/openFoodFacts'

interface Props {
  open: boolean
  onClose: () => void
  date: string
  mealType: MealType
  mealLabel: string
  onLogged: () => void
}

type TopTab = 'local' | 'online' | 'meals'
type Mode = 'pick' | 'grams' | 'create'

const MEAL_LABELS: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

export default function LogFoodSheet({ open, onClose, date, mealType, mealLabel, onLogged }: Props) {
  const [prevOpen, setPrevOpen] = useState(open)
  const [mode, setMode] = useState<Mode>('pick')
  const [tab, setTab] = useState<TopTab>('local')
  const [search, setSearch] = useState('')
  const [onlineSearch, setOnlineSearch] = useState('')
  const [onlineResults, setOnlineResults] = useState<OFFProduct[]>([])
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [onlineError, setOnlineError] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [gramsStr, setGramsStr] = useState('100')
  const [saving, setSaving] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')

  // Reset when sheet opens
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMode('pick'); setTab('local'); setSearch(''); setOnlineSearch('')
      setOnlineResults([]); setOnlineError(''); setSelectedFood(null)
      setGramsStr('100'); setSaving(false); setBarcodeError('')
    }
  }

  const allFoods = useLiveQuery(() => db.foods.filter(f => f.deletedAt === null).sortBy('name'), [])
  const savedMeals = useLiveQuery(() => db.savedMeals.filter(m => m.deletedAt === null).sortBy('name'), []) ?? []

  const recentUuids = useLiveQuery(async () => {
    const entries = await db.foodEntries.orderBy('updatedAt').reverse().filter(e => e.deletedAt === null).limit(60).toArray()
    const seen = new Set<string>(); const uuids: string[] = []
    for (const e of entries) { if (!seen.has(e.foodUuid)) { seen.add(e.foodUuid); uuids.push(e.foodUuid) } }
    return uuids
  }, [])

  const sortedFoods = useMemo(() => {
    const foods = allFoods ?? []
    const recent = recentUuids ?? []
    const q = search.trim().toLowerCase()
    const filtered = q ? foods.filter(f => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q)) : foods
    return [...filtered].sort((a, b) => {
      const ai = recent.indexOf(a.uuid), bi = recent.indexOf(b.uuid)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1; if (bi !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }, [allFoods, recentUuids, search])

  async function handleLog(food: Food, grams: number) {
    if (grams <= 0) return
    setSaving(true)
    try {
      await db.foodEntries.add({ uuid: crypto.randomUUID(), date, foodUuid: food.uuid, mealType, grams, updatedAt: Date.now(), deletedAt: null })
      onLogged(); onClose()
    } finally { setSaving(false) }
  }

  async function handleLogOffProduct(product: OFFProduct) {
    const now = Date.now()
    // Save to local DB so it appears in "My Foods" next time
    const food: Food = {
      uuid: product.barcode ? `barcode-${product.barcode}` : crypto.randomUUID(),
      name: product.name, brand: product.brand || undefined,
      caloriesPer100g: product.caloriesPer100g, protein: product.protein,
      carbs: product.carbs, fat: product.fat, isCustom: true, updatedAt: now, deletedAt: null,
    }
    await db.foods.put(food)
    setSelectedFood(food); setGramsStr('100'); setMode('grams')
  }

  async function handleLogMeal(meal: SavedMeal) {
    const now = Date.now()
    const foods = await db.foods.bulkGet(meal.items.map(i => i.foodUuid))
    const foodMap = Object.fromEntries(foods.filter(Boolean).map(f => [f!.uuid, f!]))
    for (const item of meal.items) {
      if (!foodMap[item.foodUuid]) continue
      await db.foodEntries.add({ uuid: crypto.randomUUID(), date, foodUuid: item.foodUuid, mealType, grams: item.grams, updatedAt: now, deletedAt: null })
    }
    onLogged(); onClose()
  }

  async function doOnlineSearch() {
    const q = onlineSearch.trim()
    if (!q) return
    setOnlineLoading(true); setOnlineError('')
    try {
      const results = await searchFoodsOnline(q)
      setOnlineResults(results)
      if (results.length === 0) setOnlineError('No results found.')
    } catch {
      setOnlineError('Search failed. Check your connection and try again.')
    } finally { setOnlineLoading(false) }
  }

  async function handleBarcodeScan(barcode: string) {
    setScannerOpen(false); setBarcodeLoading(true); setBarcodeError('')
    try {
      const product = await lookupBarcode(barcode)
      if (product) {
        await handleLogOffProduct(product)
      } else {
        setBarcodeError(`Barcode ${barcode} not found in database.`)
        setTab('local')
      }
    } catch {
      setBarcodeError('Lookup failed. Check your connection.')
      setTab('local')
    } finally { setBarcodeLoading(false) }
  }

  const grams = parseFloat(gramsStr)
  const preview = selectedFood && !isNaN(grams) && grams > 0 ? macrosForGrams(selectedFood, grams) : null

  const sheetTitle = mode === 'create' ? 'New Food' : mode === 'grams' ? (selectedFood?.name ?? '') : `Add to ${mealLabel}`

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={sheetTitle}>
        {/* ── PICK MODE ── */}
        {mode === 'pick' && (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgb(var(--color-surface-2))', borderRadius: 10, padding: 4 }}>
              {([['local', 'My Foods'], ['online', 'Online'], ['meals', 'Meals']] as [TopTab, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: tab === t ? 'rgb(var(--color-surface))' : 'transparent',
                    color: tab === t ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
                    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── LOCAL tab ── */}
            {tab === 'local' && (
              <>
                {barcodeError && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#ef4444' }}>{barcodeError}</p>}
                {barcodeLoading && <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>Looking up barcode…</p>}

                {/* Quick-add chips */}
                {!search && recentUuids && recentUuids.length > 0 && (() => {
                  const chips = recentUuids.slice(0, 5).map(uuid => allFoods?.find(f => f.uuid === uuid)).filter(Boolean)
                  if (!chips.length) return null
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <div style={sectionLabel}>Quick Add</div>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {chips.map(food => food && (
                          <button key={food.uuid} style={quickChipStyle} onClick={() => { setSelectedFood(food); setMode('grams') }}>
                            {food.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Search + barcode button */}
                <div style={{ position: 'relative', marginBottom: 12, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--color-text-muted))', pointerEvents: 'none' }} />
                    <input className="input" placeholder="Search foods…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => setScannerOpen(true)} aria-label="scan barcode">
                    <Camera size={18} />
                  </button>
                </div>

                <button onClick={() => setMode('create')} style={dashedBtn}><Plus size={16} /> Create new food</button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {sortedFoods.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgb(var(--color-text-muted))', fontSize: 14, padding: '20px 0' }}>
                      {search ? 'No match — try searching online.' : 'No foods yet.'}
                    </p>
                  ) : sortedFoods.map(food => (
                    <button key={food.uuid} className="pick-row" onClick={() => { setSelectedFood(food); setMode('grams') }}>
                      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</div>
                        {food.brand && <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>{food.brand}</div>}
                      </div>
                      <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', whiteSpace: 'nowrap', flexShrink: 0 }}>{food.caloriesPer100g} kcal/100g</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── ONLINE tab ── */}
            {tab === 'online' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Globe size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(var(--color-text-muted))', pointerEvents: 'none' }} />
                    <input
                      className="input"
                      placeholder="Search Open Food Facts…"
                      value={onlineSearch}
                      onChange={e => setOnlineSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void doOnlineSearch()}
                      style={{ paddingLeft: 38 }}
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => void doOnlineSearch()} disabled={onlineLoading || !onlineSearch.trim()}>
                    {onlineLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Go'}
                  </button>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>
                  Powered by Open Food Facts (open database). Results are saved to My Foods after logging.
                </p>

                {onlineError && <p style={{ color: onlineError.includes('failed') ? '#ef4444' : 'rgb(var(--color-text-muted))', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>{onlineError}</p>}

                {onlineResults.map((prod, i) => (
                  <button key={i} className="pick-row" onClick={() => void handleLogOffProduct(prod)}>
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</div>
                      {prod.brand && <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>{prod.brand}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', whiteSpace: 'nowrap', flexShrink: 0 }}>{prod.caloriesPer100g} kcal/100g</div>
                  </button>
                ))}
              </>
            )}

            {/* ── MEALS tab ── */}
            {tab === 'meals' && (
              <>
                {savedMeals.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <BookOpen size={32} style={{ color: 'rgb(var(--color-text-muted))', marginBottom: 8 }} />
                    <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: 14, margin: 0 }}>
                      No saved meals yet. Log some foods then use "Save as meal" to create a template.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {savedMeals.map(meal => {
                      const totalKcal = meal.items.reduce((sum, item) => {
                        // approximate inline — full lookup would need async
                        return sum
                      }, 0)
                      return (
                        <div key={meal.uuid} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{meal.name}</div>
                            <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
                              {meal.items.length} item{meal.items.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => void handleLogMeal(meal)}>
                            Log
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── GRAMS MODE ── */}
        {mode === 'grams' && selectedFood && (
          <>
            <button className="btn btn-ghost" style={{ padding: '4px 0', marginBottom: 12, marginLeft: -4 }} onClick={() => setMode('pick')}>
              <ChevronLeft size={18} /> Back
            </button>
            <div className="card" style={{ padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{selectedFood.caloriesPer100g} kcal</span>
                <span>P {selectedFood.protein}g</span>
                <span>C {selectedFood.carbs}g</span>
                <span>F {selectedFood.fat}g</span>
                <span style={{ fontStyle: 'italic' }}>per 100g</span>
              </div>
            </div>
            <label style={lbl}>Grams</label>
            <input className="input" type="number" inputMode="decimal" placeholder="100" value={gramsStr} onChange={e => setGramsStr(e.target.value)} autoFocus style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 16 }} />
            {preview && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                <MacroChip label="kcal" value={preview.calories} color="rgb(var(--color-accent))" />
                <MacroChip label="protein" value={preview.protein} color="#3b82f6" />
                <MacroChip label="carbs" value={preview.carbs} color="#f97316" />
                <MacroChip label="fat" value={preview.fat} color="#ef4444" />
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => selectedFood && void handleLog(selectedFood, grams)} disabled={saving || !preview}>
              {saving ? 'Logging…' : `Log to ${MEAL_LABELS[mealType]}`}
            </button>
          </>
        )}

        {/* ── CREATE MODE ── */}
        {mode === 'create' && (
          <AddFoodForm onCancel={() => setMode('pick')} onSaved={food => { setSelectedFood(food); setMode('grams') }} />
        )}
      </BottomSheet>

      {/* Barcode scanner overlay (outside BottomSheet to avoid z-index issues) */}
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={barcode => void handleBarcodeScan(barcode)} />
    </>
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

const dashedBtn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', border: '1.5px dashed rgb(var(--color-border))', borderRadius: 12, background: 'transparent', color: 'rgb(var(--color-accent))', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'rgb(var(--color-text-muted))' }
const quickChipStyle: React.CSSProperties = { flexShrink: 0, padding: '7px 14px', borderRadius: 100, border: '1.5px solid rgb(var(--color-border))', background: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text))', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8 }
