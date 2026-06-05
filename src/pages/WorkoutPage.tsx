import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Play, History } from 'lucide-react'
import { useSession } from '../store/sessionStore'

export default function WorkoutPage() {
  const navigate = useNavigate()
  const hydrated = useSession(s => s.hydrated)
  const workout = useSession(s => s.workout)
  const exercises = useSession(s => s.exercises)
  const startWorkout = useSession(s => s.startWorkout)

  async function handleStart() {
    // Start an empty session and go straight to the live screen — exercises are
    // added (and removed) from there.
    await startWorkout([])
    navigate('/session')
  }

  return (
    <div className="page-content">
      <h1 className="page-header">Workout</h1>

      {/* Start or resume */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        {hydrated && workout ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: 16, fontSize: 17, borderRadius: 'var(--radius-lg)', flexDirection: 'column', gap: 2 }}
            onClick={() => navigate('/session')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={20} /> Resume Workout
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · in progress
            </span>
          </button>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: 16, fontSize: 17, borderRadius: 'var(--radius-lg)' }}
            onClick={handleStart}
          >
            <Plus size={20} />
            Start Single Workout
          </button>
        )}
      </div>

      {/* Library + history */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="card nav-card" onClick={() => navigate('/exercises')}>
          <div style={{ ...iconWrap, backgroundColor: 'rgba(34 197 94 / 0.12)' }}>
            <BookOpen size={22} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Exercise Library</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Browse, search and add custom exercises
            </div>
          </div>
        </button>

        <button className="card nav-card" onClick={() => navigate('/history')}>
          <div style={{ ...iconWrap, backgroundColor: 'rgba(34 197 94 / 0.12)' }}>
            <History size={22} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Workout History</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Review past workouts, sets and volume
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

const iconWrap: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
