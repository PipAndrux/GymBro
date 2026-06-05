import { useRef, useState } from 'react'
import { Download, Upload, Info } from 'lucide-react'
import { db } from '../db'
import { useSettings, setSetting, type Unit, type ThemePreference } from '../lib/settings'
import BottomSheet from '../components/BottomSheet'

// ── Export/import helpers (module-level — no purity warnings) ──────────────────

async function exportBackup() {
  const [exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, settings] = await Promise.all([
    db.exercises.filter(e => e.isCustom && e.deletedAt === null).toArray(),
    db.routines.filter(r => r.deletedAt === null).toArray(),
    db.workouts.filter(w => w.deletedAt === null).toArray(),
    db.sets.filter(s => s.deletedAt === null).toArray(),
    db.foods.filter(f => f.isCustom && f.deletedAt === null).toArray(),
    db.foodEntries.filter(e => e.deletedAt === null).toArray(),
    db.dailyGoals.filter(g => g.deletedAt === null).toArray(),
    db.settings.toArray(),
  ])
  const blob = new Blob(
    [JSON.stringify({ version: 1, exercises, routines, workouts, sets, foods, foodEntries, dailyGoals, settings }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fittracker-backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

interface Backup {
  version: number
  exercises?: unknown[]
  routines?: unknown[]
  workouts?: unknown[]
  sets?: unknown[]
  foods?: unknown[]
  foodEntries?: unknown[]
  dailyGoals?: unknown[]
  settings?: unknown[]
}

async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const backup = JSON.parse(text) as Backup
  if (typeof backup !== 'object' || backup.version !== 1) {
    throw new Error('Unrecognised backup file — version must be 1.')
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
  ].filter(Boolean))
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { units, defaultRestSeconds, theme } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState(false)
  const [restoring, setRestoring] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) {
      setImportFile(file)
      setImportError('')
      setImportDone(false)
    }
  }

  async function handleRestore() {
    if (!importFile) return
    setRestoring(true)
    setImportError('')
    try {
      await importBackup(importFile)
      setImportDone(true)
      setImportFile(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import backup.')
    } finally {
      setRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="page-content">
      <h1 className="page-header">Settings</h1>

      {/* Preferences */}
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
            <button
              className="rest-step"
              onClick={() => void setSetting('defaultRestSeconds', Math.max(15, defaultRestSeconds - 15))}
            >
              −15
            </button>
            <span style={{ minWidth: 52, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {defaultRestSeconds < 60 ? `${defaultRestSeconds}s` : `${Math.floor(defaultRestSeconds / 60)}:${String(defaultRestSeconds % 60).padStart(2, '0')}`}
            </span>
            <button
              className="rest-step"
              onClick={() => void setSetting('defaultRestSeconds', defaultRestSeconds + 15)}
            >
              +15
            </button>
          </div>
        </SettingRow>
      </Section>

      {/* Appearance */}
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

      {/* Data */}
      <Section title="Data">
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          All your data lives on this device. Export a JSON backup to keep a copy or transfer to another device.
          Custom exercises and foods are included; built-in exercises are re-seeded automatically.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', gap: 10 }}
            onClick={() => void exportBackup()}
          >
            <Download size={18} /> Export JSON backup
          </button>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', gap: 10 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} /> Import from backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {importDone && (
          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#22c55e', fontWeight: 600 }}>
            Backup restored successfully.
          </p>
        )}
      </Section>

      {/* About */}
      <Section title="About">
        <div className="card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Info size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgb(var(--color-text))' }}>Fit Tracker</strong> — personal PWA, v1.0
            <br />
            On iOS: install via Safari → Share → Add to Home Screen. Rest-timer alerts only fire reliably while the app is open and on screen — background and lock-screen firing is not guaranteed.
          </div>
        </div>
      </Section>

      {/* Import confirm sheet */}
      <BottomSheet open={importFile !== null} onClose={() => setImportFile(null)} title="Restore from backup?">
        <p style={{ margin: '0 0 8px', fontSize: 14, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          This will merge the backup into your existing data. Records with matching IDs will be overwritten. This cannot be undone.
        </p>
        {importError && (
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#ef4444' }}>{importError}</p>
        )}
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
          File: <strong>{importFile?.name}</strong>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImportFile(null)}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRestore} disabled={restoring}>
            {restoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 0',
      borderTop: border ? '1px solid rgb(var(--color-border))' : 'none',
    }}>
      <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  )
}
