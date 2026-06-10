import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings } from 'lucide-react'
import { db } from '../db'
import { useAuth } from '../store/authStore'
import { useSettings } from '../lib/settings'
import { formatDurationShort, formatVolume, formatDateLong } from '../lib/format'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { units } = useSettings()

  // ── Last workout (moved from the homepage — same data, same look) ──
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

  // User display fields from Supabase profile/auth.
  const meta = user?.user_metadata as { full_name?: string } | undefined
  const displayName = meta?.full_name?.trim() || user?.email?.split('@')[0] || 'Guest'
  const subtitle = user?.email ?? 'Not signed in'

  return (
    <div className="page-content">
      <h1 className="page-header">Profile</h1>

      {/* ── User info ─────────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
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

      {/* ── Last workout ──────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
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

      {/* ── Settings ──────────────────────────────────────────── */}
      <div style={{ padding: '0 16px' }}>
        <button className="btn btn-secondary" style={{ width: '100%', gap: 10 }} onClick={() => navigate('/settings')}>
          <Settings size={18} /> Settings
        </button>
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgb(var(--color-text-muted))',
  marginBottom: 8,
}
