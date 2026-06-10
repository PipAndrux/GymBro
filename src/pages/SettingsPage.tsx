import { useRef, useState } from 'react'
import { Download, Upload, Info, FileText, FileSpreadsheet, Bell, BellOff } from 'lucide-react'
import { db } from '../db'
import { useSettings, setSetting, ACCENT_PALETTES, type Unit, type ThemePreference, type AccentColor } from '../lib/settings'
import { exportWorkoutsCsv, exportRoutinesCsv } from '../lib/exportCsv'
import { exportWorkoutsPdf, exportRoutinesPdf } from '../lib/exportPdf'
import { useAuth } from '../store/authStore'
import { supabaseConfigured } from '../lib/supabase'
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

export default function SettingsPage() {
  const { units, defaultRestSeconds, theme, accentColor, notificationsEnabled } = useSettings()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState(false)
  const [restoring, setRestoring] = useState(false)

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

  return (
    <div className="page-content">
      <h1 className="page-header">Settings</h1>

      {/* ── Auth section ─────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        {user ? (
          <UserCard user={user} />
        ) : (
          <SignInCard />
        )}
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
        <SettingRow label="Accent color" border>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(ACCENT_PALETTES) as [AccentColor, typeof ACCENT_PALETTES[AccentColor]][]).map(([id, p]) => (
              <button
                key={id}
                aria-label={id}
                onClick={() => void setSetting('accentColor', id)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                  background: p.hex, border: 'none', padding: 0,
                  outline: accentColor === id ? `3px solid ${p.hex}` : '3px solid transparent',
                  outlineOffset: 2,
                  transition: 'outline 0.15s ease',
                }}
              />
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* ── Notifications ────────────────────────────────────── */}
      <Section title="Notifications">
        <NotificationsRow enabled={notificationsEnabled} onToggle={async (on) => {
          if (on) {
            if (!('Notification' in window)) return
            const perm = await Notification.requestPermission()
            if (perm === 'granted') {
              await setSetting('notificationsEnabled', true)
              new Notification('GymBro', { body: 'Workout reminders are on. We\'ll nudge you when you go quiet.' })
            }
          } else {
            await setSetting('notificationsEnabled', false)
          }
        }} />
      </Section>

      {/* ── Data ─────────────────────────────────────────────── */}
      <Section title="Data">
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          All your data lives on this device. Export a backup to keep a copy, share with a coach, or import into a spreadsheet.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>Workouts</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} onClick={() => void exportWorkoutsPdf(units)}>
              <FileText size={16} /> PDF
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} onClick={() => void exportWorkoutsCsv(units)}>
              <FileSpreadsheet size={16} /> CSV
            </button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>Routines</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} onClick={() => void exportRoutinesPdf()}>
              <FileText size={16} /> PDF
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, gap: 8, fontSize: 13 }} onClick={() => void exportRoutinesCsv()}>
              <FileSpreadsheet size={16} /> CSV
            </button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>Full backup</div>
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

function UserCard({ user }: { user: { email?: string; user_metadata?: { full_name?: string; avatar_url?: string } } }) {
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

function NotificationsRow({ enabled, onToggle }: { enabled: boolean; onToggle: (on: boolean) => Promise<void> }) {
  const unsupported = !('Notification' in window)
  const denied = !unsupported && Notification.permission === 'denied'

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            {enabled ? <Bell size={16} style={{ color: 'rgb(var(--color-accent))' }} /> : <BellOff size={16} style={{ color: 'rgb(var(--color-text-muted))' }} />}
            Workout reminders
          </div>
          {unsupported && (
            <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 3 }}>Not supported in this browser.</div>
          )}
          {denied && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 3 }}>Blocked in browser settings — enable in your device's notification settings.</div>
          )}
          {!unsupported && !denied && (
            <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 3 }}>
              Note: iOS PWAs don't support background notifications.
            </div>
          )}
        </div>
        <button
          disabled={unsupported || denied}
          onClick={() => void onToggle(!enabled)}
          style={{
            width: 44, height: 26, borderRadius: 13, border: 'none', cursor: unsupported || denied ? 'default' : 'pointer',
            background: enabled ? 'rgb(var(--color-accent))' : 'rgb(var(--color-surface-2))',
            position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
            opacity: unsupported || denied ? 0.4 : 1,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 20, height: 20,
            borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease',
          }} />
        </button>
      </div>
    </div>
  )
}

