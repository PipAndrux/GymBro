import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Play } from 'lucide-react'
import { useSession } from '../store/sessionStore'
import ExercisePicker from '../components/ExercisePicker'
import type { Exercise } from '../types'

export default function WorkoutPage() {
  const navigate = useNavigate()
  const hydrated = useSession(s => s.hydrated)
  const workout = useSession(s => s.workout)
  const exercises = useSession(s => s.exercises)
  const startWorkout = useSession(s => s.startWorkout)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function handleStart(selected: Exercise[]) {
    setPickerOpen(false)
    await startWorkout(selected)
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
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={20} />
            Start Single Workout
          </button>
        )}
      </div>

      {/* Exercise library */}
      <div style={{ padding: '0 16px' }}>
        <p className="section-title" style={{ padding: 0, marginBottom: 8 }}>Library</p>
        <button
          className="card"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', border: 'none', textAlign: 'left' }}
          onClick={() => navigate('/exercises')}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(99 102 241 / 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={22} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Exercise Library</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
              Browse, search and add custom exercises
            </div>
          </div>
        </button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleStart}
        title="Choose Exercises"
        confirmLabel="Start Workout"
      />
    </div>
  )
}
