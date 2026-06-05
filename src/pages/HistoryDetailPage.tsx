import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock, Dumbbell, LineChart } from 'lucide-react'
import { db } from '../db'
import type { Exercise, WorkoutSet, Workout } from '../types'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import { formatDateLong, formatTime, formatDurationShort, formatVolume } from '../lib/format'
import { useSettings } from '../lib/settings'

interface Group {
  exercise: Exercise | undefined
  sets: WorkoutSet[]
}

interface Detail {
  workout: Workout
  groups: Group[]
  volume: number
  setCount: number
}

export default function HistoryDetailPage() {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const { units } = useSettings()

  const detail = useLiveQuery(async (): Promise<Detail | null> => {
    if (!uuid) return null
    const workout = await db.workouts.get(uuid)
    if (!workout) return null
    const sets = await db.sets
      .where('workoutUuid')
      .equals(uuid)
      .filter(s => s.deletedAt === null)
      .toArray()

    // Group sets by exercise, ordered by when each exercise was first added.
    const byEx = new Map<string, WorkoutSet[]>()
    for (const s of sets) {
      const arr = byEx.get(s.exerciseUuid)
      if (arr) arr.push(s)
      else byEx.set(s.exerciseUuid, [s])
    }
    const ordered = [...byEx.entries()]
      .map(([exUuid, arr]) => ({
        exUuid,
        sets: arr.sort((a, b) => a.setNumber - b.setNumber),
        firstAt: Math.min(...arr.map(s => s.updatedAt)),
      }))
      .sort((a, b) => a.firstAt - b.firstAt)

    const groups: Group[] = await Promise.all(
      ordered.map(async g => ({ exercise: await db.exercises.get(g.exUuid), sets: g.sets }))
    )
    const volume = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
    return { workout, groups, volume, setCount: sets.length }
  }, [uuid])

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '8px 4px', marginLeft: -4 }}
            onClick={() => navigate('/history')}
            aria-label="back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {detail?.workout.name ?? 'Workout'}
          </h1>
        </div>
      </div>

      {detail === undefined ? (
        <div className="empty-state">
          <p>Loading…</p>
        </div>
      ) : detail === null ? (
        <div className="empty-state">
          <p>This workout could not be found.</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 0' }}>
          {/* Summary */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>
              {formatDateLong(detail.workout.startedAt)} · {formatTime(detail.workout.startedAt)}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={stat}>
                <Clock size={15} /> {formatDurationShort((detail.workout.endedAt ?? detail.workout.startedAt) - detail.workout.startedAt)}
              </span>
              <span style={stat}>
                <Dumbbell size={15} /> {formatVolume(detail.volume, units)}
              </span>
              <span style={stat}>
                {detail.groups.length} ex · {detail.setCount} set{detail.setCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Exercises */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {detail.groups.map(({ exercise, sets }, gi) => {
              const color = exercise ? MUSCLE_COLORS[exercise.primaryMuscle] : '#94a3b8'
              return (
                <div
                  key={exercise?.uuid ?? gi}
                  className="card"
                  style={{ padding: 14, cursor: exercise ? 'pointer' : 'default' }}
                  onClick={exercise ? () => navigate(`/progress/${exercise.uuid}`) : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{exercise?.name ?? 'Deleted exercise'}</span>
                    {exercise && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: 100,
                          textTransform: 'capitalize',
                          background: `${color}22`,
                          color,
                        }}
                      >
                        {exercise.primaryMuscle}
                      </span>
                    )}
                    {exercise && (
                      <LineChart size={15} style={{ color: 'rgb(var(--color-text-muted))', marginLeft: 'auto', flexShrink: 0 }} />
                    )}
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sets.map((s, i) => (
                      <div key={s.uuid} style={setRow}>
                        <span style={{ color: 'rgb(var(--color-text-muted))', fontWeight: 600, minWidth: 18 }}>{i + 1}</span>
                        <span style={{ fontWeight: 600 }}>
                          {s.weight} {units} × {s.reps}
                        </span>
                        {s.rpe != null && (
                          <span style={{ color: 'rgb(var(--color-text-muted))', fontSize: 13 }}>RPE {s.rpe}</span>
                        )}
                        {s.completedAt && <span style={{ color: '#22c55e', fontSize: 13, marginLeft: 'auto' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
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

const stat: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 13,
  fontWeight: 600,
  color: 'rgb(var(--color-text))',
}

const setRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 0',
  fontSize: 15,
  borderTop: '1px solid rgb(var(--color-border))',
}
