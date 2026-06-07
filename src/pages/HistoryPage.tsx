import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Dumbbell, History as HistoryIcon } from 'lucide-react'
import { db } from '../db'
import type { Workout } from '../types'
import { formatDateLong, formatTime, formatDurationShort, formatVolume } from '../lib/format'
import { useSettings } from '../lib/settings'

interface HistoryItem {
  workout: Workout
  volume: number
  setCount: number
  exerciseCount: number
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { units } = useSettings()

  const items =
    useLiveQuery(
      async () => {
        const workouts = await db.workouts
          .filter(w => w.status === 'finished' && w.deletedAt === null)
          .toArray()
        workouts.sort((a, b) => b.startedAt - a.startedAt)
        return Promise.all(
          workouts.map(async (workout): Promise<HistoryItem> => {
            const sets = await db.sets
              .where('workoutUuid')
              .equals(workout.uuid)
              .filter(s => s.deletedAt === null)
              .toArray()
            const volume = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
            const exerciseCount = new Set(sets.map(s => s.exerciseUuid)).size
            return { workout, volume, setCount: sets.length, exerciseCount }
          })
        )
      },
      [],
      [] as HistoryItem[]
    ) ?? []

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '8px 4px', marginLeft: -4 }}
            onClick={() => navigate('/')}
            aria-label="back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700 }}>History</h1>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {items.length === 0 ? (
          <div className="empty-state">
            <HistoryIcon size={40} strokeWidth={1.5} />
            <p>No finished workouts yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Start your first workout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(({ workout, volume, setCount, exerciseCount }) => {
              const duration = (workout.endedAt ?? workout.startedAt) - workout.startedAt
              return (
                <div
                  key={workout.uuid}
                  className="card"
                  style={{ cursor: 'pointer', padding: 14 }}
                  onClick={() => navigate(`/history/${workout.uuid}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{workout.name}</div>
                      <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
                        {formatDateLong(workout.startedAt)} · {formatTime(workout.startedAt)}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
                  </div>

                  <div style={statRow}>
                    <span style={stat}>
                      <Clock size={14} /> {formatDurationShort(duration)}
                    </span>
                    <span style={stat}>
                      <Dumbbell size={14} /> {formatVolume(volume, units)}
                    </span>
                    <span style={stat}>
                      {exerciseCount} ex · {setCount} set{setCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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

const statRow: React.CSSProperties = {
  display: 'flex',
  gap: 14,
  marginTop: 10,
  flexWrap: 'wrap',
}

const stat: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 13,
  fontWeight: 600,
  color: 'rgb(var(--color-text-muted))',
}
