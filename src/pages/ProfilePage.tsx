import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings, TrendingUp, History, LogOut, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { db, consolidateMeasurements, measurementUuidForType } from '../db'
import type { Measurement } from '../types'
import { useAuth } from '../store/authStore'
import { useSettings } from '../lib/settings'
import { formatDurationShort, formatVolume, formatDateLong } from '../lib/format'
import { MEASUREMENT_TYPE_DEFS } from '../lib/measurementTypes'
import BottomSheet from '../components/BottomSheet'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { units } = useSettings()
  const [addMeasurementOpen, setAddMeasurementOpen] = useState(false)

  // ── Last workout ──────────────────────────────────────────────────
  const lastWorkout = useLiveQuery(async () => {
    const workouts = await db.workouts
      .filter(w => w.status === 'finished' && w.deletedAt === null)
      .toArray()
    if (!workouts.length) return null
    workouts.sort((a, b) => b.startedAt - a.startedAt)
    const w = workouts[0]
    const sets = await db.sets
      .where('workoutUuid').equals(w.uuid)
      .filter(s => s.deletedAt === null)
      .toArray()
    const volume = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
    return { workout: w, volume, setCount: sets.length, duration: (w.endedAt ?? w.startedAt) - w.startedAt }
  }, [])

  // ── Body measurements ─────────────────────────────────────────────
  const measurementsWithLatest = useLiveQuery(async () => {
    const measurements = await db.measurements
      .filter(m => m.deletedAt === null)
      .sortBy('sortOrder')
    return Promise.all(
      measurements.map(async (m) => {
        const entries = await db.measurementEntries
          .where('measurementUuid').equals(m.uuid)
          .filter(e => e.deletedAt === null)
          .toArray()
        entries.sort((a, b) => b.date.localeCompare(a.date))
        const latest = entries[0] ?? null
        const previous = entries[1] ?? null
        return { measurement: m, latest, previous }
      })
    )
  }, [])

  const measurementCount = measurementsWithLatest?.length ?? 0
  useEffect(() => { void consolidateMeasurements() }, [measurementCount])

  async function handleAddMeasurement(type: string, label: string, unit: string) {
    const now = Date.now()
    const existing = await db.measurements.filter(m => m.type === type && m.deletedAt === null).count()
    if (existing > 0) { setAddMeasurementOpen(false); return }
    const allCount = await db.measurements.filter(m => m.deletedAt === null).count()
    const newM: Measurement = {
      uuid: measurementUuidForType(type), type, label, unit,
      isCustom: false, sortOrder: allCount,
      updatedAt: now, deletedAt: null,
    }
    await db.measurements.put(newM)
    setAddMeasurementOpen(false)
    navigate(`/measurements/${newM.uuid}`)
  }

  async function handleAddCustomMeasurement(label: string, unit: string) {
    const now = Date.now()
    const allCount = await db.measurements.filter(m => m.deletedAt === null).count()
    const newM: Measurement = {
      uuid: crypto.randomUUID(), type: `custom_${Date.now()}`, label, unit,
      isCustom: true, sortOrder: allCount,
      updatedAt: now, deletedAt: null,
    }
    await db.measurements.add(newM)
    setAddMeasurementOpen(false)
    navigate(`/measurements/${newM.uuid}`)
  }

  const trackedTypes = new Set((measurementsWithLatest ?? []).map(m => m.measurement.type))
  const availableToAdd = MEASUREMENT_TYPE_DEFS.filter(d => !d.primary && !trackedTypes.has(d.type))

  const meta = user?.user_metadata as { full_name?: string } | undefined
  const displayName = meta?.full_name?.trim() || user?.email?.split('@')[0] || 'Guest'
  const subtitle = user?.email ?? 'Not signed in'

  return (
    <div className="page-content">
      {/* ── Header with gear icon ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 4px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>Profile</h1>
        <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
          <Settings size={22} />
        </button>
      </div>

      {/* ── User info ─────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(34 197 94 / 0.15)', border: '2px solid rgba(34 197 94 / 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'rgb(var(--color-accent))', flexShrink: 0,
          }}>
            {initialsFor(displayName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 0' }}>

        {/* ── Progress & Records ────────────────────────────── */}
        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/progress')}>
          <div style={{ ...iconWrap, background: 'rgba(34 197 94 / 0.12)' }}>
            <TrendingUp size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Progress &amp; Records</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Strength charts, volume and PRs
            </div>
          </div>
        </button>

        {/* ── Workout History ───────────────────────────────── */}
        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/history')}>
          <div style={{ ...iconWrap, background: 'rgba(34 197 94 / 0.08)' }}>
            <History size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Workout History</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Review past workouts and volume
            </div>
          </div>
        </button>

        {/* ── Last Workout ──────────────────────────────────── */}
        {lastWorkout ? (
          <button
            className="card nav-card"
            style={{ padding: '14px 16px' }}
            onClick={() => navigate('/history')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={sectionLabel}>Last Workout</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastWorkout.workout.name}
              </div>
              <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
                {formatDateLong(lastWorkout.workout.startedAt)}
                {' · '}{formatDurationShort(lastWorkout.duration)}
                {' · '}{formatVolume(lastWorkout.volume, units)}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
          </button>
        ) : (
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={sectionLabel}>Last Workout</div>
            <div style={{ fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>No workouts yet.</div>
          </div>
        )}

      </div>

      {/* ── Body Measurements ─────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="section-title" style={{ padding: 0, marginBottom: 10 }}>Body Measurements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(measurementsWithLatest ?? []).map(({ measurement, latest, previous }) => (
            <button
              key={measurement.uuid}
              className="card nav-card"
              style={{ padding: '14px 16px', gap: 12 }}
              onClick={() => navigate(`/measurements/${measurement.uuid}`)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 3 }}>
                  {measurement.label}
                </div>
                {latest ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {latest.value}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}>
                      {measurement.unit}
                    </span>
                    {previous && (() => {
                      const delta = latest.value - previous.value
                      if (Math.abs(delta) < 0.01) return null
                      const up = delta > 0
                      return (
                        <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: 1 }}>
                          {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                          {Math.abs(Math.round(delta * 10) / 10)}
                        </span>
                      )
                    })()}
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: 'rgb(var(--color-text-muted))', fontStyle: 'italic' }}>No entries yet</span>
                )}
                {latest && (
                  <div style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
                    {latest.date}
                  </div>
                )}
              </div>
              <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
            </button>
          ))}

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 4 }}
            onClick={() => setAddMeasurementOpen(true)}
          >
            <Plus size={18} /> Add Measurement
          </button>
        </div>
      </div>

      {/* ── Sign Out ──────────────────────────────────────────── */}
      {user && (
        <div style={{ padding: '20px 16px 0' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', gap: 10, color: '#ef4444' }}
            onClick={() => void signOut()}
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}

      {/* ── Add measurement sheet ─────────────────────────────── */}
      <AddMeasurementSheet
        open={addMeasurementOpen}
        onClose={() => setAddMeasurementOpen(false)}
        available={availableToAdd}
        onAdd={handleAddMeasurement}
        onAddCustom={handleAddCustomMeasurement}
      />
    </div>
  )
}

// ── Add measurement sheet ──────────────────────────────────────────────────────

interface AddMeasurementSheetProps {
  open: boolean
  onClose: () => void
  available: typeof MEASUREMENT_TYPE_DEFS
  onAdd: (type: string, label: string, unit: string) => void
  onAddCustom: (label: string, unit: string) => void
}

function AddMeasurementSheet({ open, onClose, available, onAdd, onAddCustom }: AddMeasurementSheetProps) {
  const [customMode, setCustomMode] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customUnit, setCustomUnit] = useState('cm')

  function reset() { setCustomMode(false); setCustomLabel(''); setCustomUnit('cm') }

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title={customMode ? 'Custom Measurement' : 'Add Measurement'}>
      {!customMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {available.length === 0 ? (
            <p style={{ color: 'rgb(var(--color-text-muted))', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              All predefined measurements are already added.
            </p>
          ) : (
            available.map(def => (
              <button
                key={def.type}
                className="pick-row"
                onClick={() => onAdd(def.type, def.label, def.defaultUnit)}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: 600, fontSize: 15 }}>{def.label}</span>
                <span style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>{def.defaultUnit}</span>
              </button>
            ))
          )}
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => setCustomMode(true)}>
            Custom measurement…
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Name</label>
            <input className="input" placeholder="e.g. Neck" value={customLabel} onChange={e => setCustomLabel(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <input className="input" placeholder="e.g. cm" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCustomMode(false)}>← Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!customLabel.trim() || !customUnit.trim()}
              onClick={() => { onAddCustom(customLabel.trim(), customUnit.trim()); reset() }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgb(var(--color-text-muted))',
  marginBottom: 8,
}

const iconWrap: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 'var(--radius-md)',
  background: 'rgba(34 197 94 / 0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
