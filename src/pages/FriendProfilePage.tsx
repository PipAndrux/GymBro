// Phase 3 — Task 1: read-only friend profile. Shows a friend's public stats and
// the workouts they've shared (privacy is enforced server-side by RLS; private
// workouts never reach the client). Each workout can be copied (Task 2) and the
// header links to the weight comparison (Task 3).

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronDown, Dumbbell, Flame, Trophy, Clock, Layers,
  Copy, Check, BarChart3, Users,
} from 'lucide-react'
import Avatar from '../components/Avatar'
import {
  getFriendProfileData, copyFriendWorkoutToRoutine,
  type FriendProfileData, type FriendWorkout,
} from '../lib/social'
import { formatVolume, formatDurationShort, formatDateLong } from '../lib/format'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import type { MuscleGroup } from '../types'
import { useSettings } from '../lib/settings'

export default function FriendProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { units } = useSettings()
  const [data, setData] = useState<FriendProfileData | null | undefined>(undefined)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    setData(undefined)
    ;(async () => {
      const d = id ? await getFriendProfileData(id) : null
      if (!cancelled) setData(d)
    })()
    return () => { cancelled = true }
  }, [id])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  const profile = data && data !== undefined ? data.profile : null
  const color = profile?.avatarColor ?? '#22c55e'

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate(-1)} aria-label="back">
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.displayName ?? 'Profile'}
          </h1>
        </div>
      </div>

      {data === undefined ? (
        <div className="empty-state" style={{ paddingTop: 60 }}><p>Loading…</p></div>
      ) : data === null ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <Users size={36} strokeWidth={1.5} />
          <p>This profile could not be found.</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identity + stats */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={data.profile.displayName} color={color} size={58} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.profile.displayName}
                </div>
                <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>@{data.profile.username}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <StatCell icon={<Dumbbell size={15} />} label="Workouts" value={String(data.stats.totalWorkouts)} />
              <StatCell icon={<Flame size={15} />} label="Streak" value={`${data.stats.currentStreak}d`} />
              <StatCell icon={<Trophy size={15} />} label="PRs" value={String(data.stats.prs)} />
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 14, gap: 8 }}
              onClick={() => navigate(`/friend/${id}/compare`)}
            >
              <BarChart3 size={17} /> Compare lifts
            </button>
          </div>

          {!data.isFriend && (
            <div className="card" style={{ padding: 14, fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
              You're not friends yet — add each other to see friends-only workouts.
            </div>
          )}

          {/* Workout history */}
          <div>
            <div className="section-title" style={{ padding: 0, marginBottom: 8 }}>Workouts</div>
            {data.workouts.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <Dumbbell size={34} strokeWidth={1.5} />
                <p>No shared workouts yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.workouts.map(w => (
                  <WorkoutCard
                    key={w.uuid}
                    workout={w}
                    units={units}
                    onCopy={async () => {
                      const routine = await copyFriendWorkoutToRoutine(w, data.profile.username)
                      showToast(`Added “${routine.name}” to your routines`)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={toastStyle}>
          <Check size={16} style={{ color: 'rgb(var(--color-accent))' }} /> {toast}
        </div>
      )}
    </div>
  )
}

// ── Workout card (expandable detail + copy) ───────────────────────────────────

function WorkoutCard({ workout, units, onCopy }: { workout: FriendWorkout; units: string; onCopy: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'done' | 'error'>('idle')
  const hasDetail = workout.exercises.length > 0 || workout.topExercises.length > 0 || workout.prs.length > 0

  async function handleCopy() {
    if (copyState === 'copying') return
    setCopyState('copying')
    try {
      await onCopy()
      setCopyState('done')
      window.setTimeout(() => setCopyState('idle'), 2200)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2200)
    }
  }

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{workout.name}</div>
          <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
            {formatDateLong(workout.startedAt)}
          </div>
        </div>
        {workout.prCount > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
            color: 'rgb(var(--color-accent-amber))', padding: '3px 8px', borderRadius: 100,
            background: 'rgba(245 158 11 / 0.14)', flexShrink: 0,
          }}>
            <Trophy size={12} /> {workout.prCount}
          </span>
        )}
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        <Stat icon={<Clock size={14} />} value={formatDurationShort(workout.durationMs)} />
        <Stat icon={<Dumbbell size={14} />} value={formatVolume(workout.volume, units)} />
        <Stat icon={<Layers size={14} />} value={`${workout.setCount} sets`} />
      </div>

      {/* Muscle chips */}
      {workout.muscleGroups.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {workout.muscleGroups.map(m => {
            const c = MUSCLE_COLORS[m as MuscleGroup] ?? '#94a3b8'
            return (
              <span key={m} style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                textTransform: 'capitalize', background: `${c}22`, color: c,
              }}>
                {m}
              </span>
            )
          })}
        </div>
      )}

      {/* Detail */}
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgb(var(--color-border))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workout.exercises.length > 0 ? (
            workout.exercises.map((ex, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ex.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {ex.sets.map((s, j) => (
                    <span key={j} style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                      {s.weight}{units}×{s.reps}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            workout.topExercises.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{e.name}</span>
                <span style={{ color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                  {e.sets}× · {formatVolume(e.volume, units)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, gap: 7, padding: '9px 0', fontSize: 14 }}
          onClick={handleCopy}
          disabled={copyState === 'copying'}
        >
          {copyState === 'done' ? <Check size={16} /> : <Copy size={16} />}
          {copyState === 'done' ? 'Copied' : copyState === 'copying' ? 'Copying…' : copyState === 'error' ? 'Try again' : 'Copy'}
        </button>
        {hasDetail && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, gap: 4, color: 'rgb(var(--color-text-muted))', padding: '8px 12px' }}
            onClick={() => setOpen(o => !o)}
          >
            {open ? 'Less' : 'Details'}
            <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>
    </div>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center', background: 'rgb(var(--color-surface-2))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'rgb(var(--color-text-muted))', marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{value}</div>
    </div>
  )
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
      {icon}
      <span style={{ fontWeight: 600, color: 'rgb(var(--color-text))', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 'calc(var(--tab-bar-height) + var(--safe-bottom) + 16px)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  maxWidth: 'calc(100vw - 32px)',
  background: 'rgb(var(--color-surface-2))',
  border: '1px solid rgb(var(--color-border))',
  borderRadius: 12,
  padding: '11px 16px',
  fontSize: 14,
  fontWeight: 600,
  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
}
