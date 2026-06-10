import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, ListOrdered, ChevronRight, BookOpen } from 'lucide-react'
import { db } from '../db'
import type { Exercise, Routine } from '../types'
import { useSession } from '../store/sessionStore'
import BottomSheet from '../components/BottomSheet'

export default function RoutinesPage() {
  const navigate = useNavigate()
  const activeWorkout = useSession(s => s.workout)
  const startFromRoutine = useSession(s => s.startFromRoutine)
  const discardWorkout = useSession(s => s.discardWorkout)
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null)

  const routines =
    useLiveQuery(() => db.routines.filter(r => r.deletedAt === null).sortBy('name'), [], [] as Routine[]) ?? []

  async function launch(routine: Routine) {
    const exs = (await Promise.all(routine.exerciseOrder.map(id => db.exercises.get(id)))).filter(
      (e): e is Exercise => !!e && e.deletedAt === null
    )
    await startFromRoutine(routine, exs)
    navigate('/session')
  }

  function handleStart(routine: Routine) {
    if (activeWorkout) { setPendingRoutine(routine); return }
    void launch(routine)
  }

  async function confirmReplace() {
    if (!pendingRoutine) return
    const routine = pendingRoutine
    setPendingRoutine(null)
    await discardWorkout()
    await launch(routine)
  }

  return (
    <div className="page-content">
      <h1 className="page-header">Routines</h1>

      <div style={{ padding: '0 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 'var(--radius-lg)' }}
          onClick={() => navigate('/routines/new')}
        >
          <Plus size={20} /> Create Routine
        </button>

        {/* ── Exercise Library ─────────────────────────────── */}
        <button className="card nav-card" style={{ padding: '14px 16px' }} onClick={() => navigate('/exercises')}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(34 197 94 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={20} style={{ color: 'rgb(var(--color-accent))' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Exercise Library</div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>Browse and add custom exercises</div>
          </div>
        </button>
      </div>

      {/* ── My Routines ──────────────────────────────────── */}
      <div style={{ padding: '0 16px' }}>
        {routines.length === 0 ? (
          <div className="empty-state">
            <ListOrdered size={40} strokeWidth={1.5} />
            <p>No routines yet. Create one or start from a template below.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {routines.map(routine => (
              <div
                key={routine.uuid}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer' }}
                onClick={() => navigate(`/routines/${routine.uuid}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{routine.name}</span>
                    <ChevronRight size={16} style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>
                    {routine.exerciseOrder.length} exercise{routine.exerciseOrder.length !== 1 ? 's' : ''}
                    {routine.notes ? ` · ${routine.notes}` : ''}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 16px', flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); handleStart(routine) }}
                >
                  <Play size={16} /> Start
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Confirm workout replace ───────────────────────── */}
      <BottomSheet open={!!pendingRoutine} onClose={() => setPendingRoutine(null)} title="Workout in progress">
        <p style={{ margin: '0 0 16px', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>
          You already have a workout in progress. Starting "{pendingRoutine?.name}" will discard it.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPendingRoutine(null)}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: '#ef4444', color: '#fff', padding: '12px 20px' }} onClick={confirmReplace}>
            Discard & Start
          </button>
        </div>
      </BottomSheet>

    </div>
  )
}
