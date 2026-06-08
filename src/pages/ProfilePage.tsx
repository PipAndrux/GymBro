import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Download, Upload, Info, LogOut, ChevronRight, Plus, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { db, consolidateMeasurements, measurementUuidForType } from '../db'
import type { Measurement } from '../types'
import { useSettings, setSetting, type Unit, type ThemePreference } from '../lib/settings'
import { useAuth } from '../store/authStore'
import { supabaseConfigured } from '../lib/supabase'
import { MEASUREMENT_TYPE_DEFS } from '../lib/measurementTypes'
import BottomSheet from '../components/BottomSheet'
import SyncIndicator from '../components/SyncIndicator'

// ── Export/import helpers ──────────────────────────────────────────────────────

async function exportBackup() {
  const [exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, settings, measurements, measurementEntries] = await Promise.all([
    db.exercises.filter(e => e.isCustom && e.deletedAt === null).toArray(),
    db.routines.filter(r => r.deletedAt === null).toArray(),
    db.workouts.filter(w => w.deletedAt === null).toArray(),
    db.sets.filter(s => s.deletedAt === null).toArray(),
    db.foods.filter(f => f.isCustom && f.deletedAt === null).toArray(),
    db.foodEntries.filter(e => e.deletedAt === null).toArray(),
    db.dailyGoals.filter(g => g.deletedAt === null).toArray(),
    db.settings.toArray(),
    db.measurements.filter(m => m.deletedAt === null).toArray(),
    db.measurementEntries.filter(e => e.deletedAt === null).toArray(),
  ])
  const blob = new Blob(
    [JSON.stringify({ version: 2, exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, settings, measurements, measurementEntries }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gymbro-backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

interface Backup {
  version: number
  exercises?: unknown[]; routines?: unknown[]; workouts?: unknown[]
  sets?: unknown[]; foods?: unknown[]; foodEntries?: unknown[]
  dailyGoals?: unknown[]; settings?: unknown[]
  measurements?: unknown[]; measurementEntries?: unknown[]
}

async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const backup = JSON.parse(text) as Backup
  if (typeof backup !== 'object' || (backup.version !== 1 && backup.version !== 2)) {
    throw new Error('Unrecognised backup file.')
  }
  await Promise.all([
    backup.exercises?.length && db.exercises.bulkPut(backup.exercises as Parameters<typeof db.exercises.bulkPut>[0]),
    backup.routines?.length && db.routines.bulkPut(backup.routines as Parameters<typeof db.routines.bulkPut>[0]),
    backup.workouts?.length && db.workouts.bulkPut(backup.workouts as Parameters<typeof db.workouts.bulkPut>[0]),
    backup.sets?.length && db.sets.bulkPut(backup.sets as Parameters<typeof db.sets.bulkPut>[0]),
    backup.foods?.length && db.foods.bulkPut(backup.foods as Parameters<typeof db.foods.bulkPut>[0]),
    backup.foodEntries?.length && db.foodEntries.bulkPut(backup.foodEntries as Parameters<typeof db.foodEntries.bulkPut>[0]),
    backup.dailyGoals?.length && db.dailyGoals.bulkPut(backup.dailyGoals as Parameters<typeof db.dailyGoals.bulkPut>[0]),
    backup.settings?.length && db.settings.bulkPut(backup.settings as Parameters<typeof db.settings.bulkPut>[0]),
    backup.measurements?.length && db.measurements.bulkPut(backup.measurements as Parameters<typeof db.measurements.bulkPut>[0]),
    backup.measurementEntries?.length && db.measurementEntries.bulkPut(backup.measurementEntries as Parameters<typeof db.measurementEntries.bulkPut>[0]),
  ].filter(Boolean))
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate()
  const { units, defaultRestSeconds, theme } = useSettings()
  const { user, signOut } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [addMeasurementOpen, setAddMeasurementOpen] = useState(false)

  // Live list of all active measurements with their latest entry
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

  // Ensure primaries exist and collapse any duplicate cards (e.g. weight/height
  // created with different ids on another device). Idempotent + reactive: re-runs
  // when the count changes, so duplicates arriving via sync are cleaned up live.
  const measurementCount = measurementsWithLatest?.length ?? 0
  useEffect(() => { void consolidateMeasurements() }, [measurementCount])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) { setImportFile(file); setImportError(''); setImportDone(false) }
  }

  async function handleRestore() {
    if (!importFile) return
    setRestoring(true); setImportError('')
    try {
      await importBackup(importFile)
      setImportDone(true); setImportFile(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import backup.')
    } finally {
      setRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAddMeasurement(type: string, label: string, unit: string) {
    const now = Date.now()
    const existing = await db.measurements.filter(m => m.type === type && m.deletedAt === null).count()
    if (existing > 0) { setAddMeasurementOpen(false); return }
    const allCount = await db.measurements.filter(m => m.deletedAt === null).count()
    // Deterministic uuid per predefined type → the same type added on two devices
    // converges to one card instead of duplicating after sync. put (not add) so a
    // previously soft-deleted record of this type is revived rather than colliding.
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

  return (
    <div className="page-content">
      <h1 className="page-header">Profile</h1>

      {/* ── Auth section ─────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        {user ? (
          <UserCard user={user} onSignOut={() => void signOut()} />
        ) : (
          <SignInCard />
        )}
      </div>

      {/* ── Measurements ─────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
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

      {/* ── Preferences ──────────────────────────────────────── */}
      <Section title="Preferences">
        <SettingRow label="Weight unit">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['kg', 'lb'] as Unit[]).map(u => (
              <button
                key={u}
                className={`btn ${units === u ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 0' }}
                onClick={() => void setSetting('units', u)}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Default rest time" border>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="rest-step" onClick={() => void setSetting('defaultRestSeconds', Math.max(15, defaultRestSeconds - 15))}>−15</button>
            <span style={{ minWidth: 52, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {defaultRestSeconds < 60 ? `${defaultRestSeconds}s` : `${Math.floor(defaultRestSeconds / 60)}:${String(defaultRestSeconds % 60).padStart(2, '0')}`}
            </span>
            <button className="rest-step" onClick={() => void setSetting('defaultRestSeconds', defaultRestSeconds + 15)}>+15</button>
          </div>
        </SettingRow>
      </Section>

      {/* ── Appearance ───────────────────────────────────────── */}
      <Section title="Appearance">
        <SettingRow label="Theme">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map(t => (
              <button
                key={t}
                className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '10px 0', textTransform: 'capitalize', fontSize: 13 }}
                onClick={() => void setSetting('theme', t)}
              >
                {t}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* ── Data ─────────────────────────────────────────────── */}
      <Section title="Data">
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          All your data lives on this device. Export a JSON backup to keep a copy or transfer it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-secondary" style={{ width: '100%', gap: 10 }} onClick={() => void exportBackup()}>
            <Download size={18} /> Export JSON backup
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', gap: 10 }} onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Import from backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
        {importDone && <p style={{ margin: '12px 0 0', fontSize: 14, color: '#22c55e', fontWeight: 600 }}>Backup restored successfully.</p>}
      </Section>

      {/* ── About ────────────────────────────────────────────── */}
      <Section title="About">
        <div className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Info size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgb(var(--color-text))' }}>GymBro</strong> — personal PWA, v2.0
            <br />
            On iOS: install via Safari → Share → Add to Home Screen.
          </div>
        </div>
      </Section>

      {/* ── Add measurement sheet ─────────────────────────────── */}
      <AddMeasurementSheet
        open={addMeasurementOpen}
        onClose={() => setAddMeasurementOpen(false)}
        available={availableToAdd}
        onAdd={handleAddMeasurement}
        onAddCustom={handleAddCustomMeasurement}
      />

      {/* ── Import confirm sheet ──────────────────────────────── */}
      <BottomSheet open={importFile !== null} onClose={() => setImportFile(null)} title="Restore from backup?">
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          This will merge the backup into your existing data. Records with matching IDs will be overwritten.
        </p>
        {importError && <p style={{ margin: '0 0 8px', fontSize: 14, color: '#ef4444' }}>{importError}</p>}
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>File: <strong>{importFile?.name}</strong></p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImportFile(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRestore} disabled={restoring}>
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Auth sub-components ────────────────────────────────────────────────────────

function UserCard({ user, onSignOut }: { user: { email?: string; user_metadata?: { full_name?: string; avatar_url?: string } }; onSignOut: () => void }) {
  const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'You'
  const email = user.email ?? ''
  const initial = name[0]?.toUpperCase() ?? '?'

  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(34 197 94 / 0.15)', border: '2px solid rgba(34 197 94 / 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, color: 'rgb(var(--color-accent))', flexShrink: 0,
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{email}</div>
        <SyncIndicator />
      </div>
      <button className="icon-btn" style={{ color: 'rgb(var(--color-text-muted))' }} onClick={onSignOut} aria-label="sign out">
        <LogOut size={18} />
      </button>
    </div>
  )
}

function SignInCard() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth()
  const [emailMode, setEmailMode] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth() {
    if (!email || !password) return
    setError(''); setLoading(true)
    try {
      if (isSignUp) await signUpWithEmail(email, password)
      else await signInWithEmail(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const notConfigured = !supabaseConfigured

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          {notConfigured ? 'Cloud Sync' : 'Sign in to back up your data'}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          {notConfigured
            ? 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment to enable sign-in and cloud backup.'
            : 'Your workouts, food diary, and measurements will be backed up and available on any device.'}
        </p>
      </div>

      {!notConfigured && !emailMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <OAuthButton icon="G" label="Continue with Google" color="#4285f4" onClick={() => void signInWithGoogle()} />
          <OAuthButton icon="🍎" label="Continue with Apple" color="#fff" textColor="#000" onClick={() => void signInWithApple()} />
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setEmailMode(true)}>
            Continue with Email
          </button>
        </div>
      )}

      {!notConfigured && emailMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleEmailAuth()} />
          {error && <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEmailAuth} disabled={loading || !email || !password}>
            {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => setEmailMode(false)}>← Back</button>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => setIsSignUp(v => !v)}>
              {isSignUp ? 'Already have an account?' : 'Create account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OAuthButton({ icon, label, color, textColor = '#fff', onClick }: { icon: string; label: string; color: string; textColor?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '12px 16px', borderRadius: 'var(--radius-md)',
        background: color, border: '1px solid rgba(255,255,255,0.15)',
        color: textColor, fontSize: 15, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'opacity 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
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
            <TrendingUp size={16} /> Custom measurement…
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

// ── Generic sub-components ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 16px', marginBottom: 24 }}>
      <div className="section-title" style={{ padding: 0, marginBottom: 10 }}>{title}</div>
      <div className="card" style={{ padding: '4px 16px' }}>{children}</div>
    </div>
  )
}

function SettingRow({ label, border = false, children }: { label: string; border?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '14px 0',
      borderTop: border ? '1px solid rgb(var(--color-border))' : 'none',
    }}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
