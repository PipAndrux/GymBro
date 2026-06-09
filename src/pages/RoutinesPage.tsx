import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, ListOrdered, ChevronRight, BookOpen } from 'lucide-react'
import { db } from '../db'
import type { Exercise, Routine } from '../types'
import { useSession } from '../store/sessionStore'
import BottomSheet from '../components/BottomSheet'
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '../data/programTemplates'

export default function RoutinesPage() {
  const navigate = useNavigate()
  const activeWorkout = useSession(s => s.workout)
  const startFromRoutine = useSession(s => s.startFromRoutine)
  const discardWorkout = useSession(s => s.discardWorkout)
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null)
  const [cloningTemplate, setCloningTemplate] = useState<ProgramTemplate | null>(null)
  const [cloneSuccess, setCloneSuccess] = useState('')

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

  async function cloneTemplate(template: ProgramTemplate) {
    const now = Date.now()
    for (const [i, day] of template.days.entries()) {
      const routine: Routine = {
        uuid: crypto.randomUUID(),
        name: day.name,
        exerciseOrder: day.exerciseIds,
        notes: day.notes,
        createdAt: now + i,
        updatedAt: now + i,
        deletedAt: null,
      }
      await db.routines.add(routine)
    }
    setCloningTemplate(null)
    setCloneSuccess(template.name)
    setTimeout(() => setCloneSuccess(''), 3000)
  }

  return (
    <div className="page-content">
      <h1 className="page-header">Routines</h1>

      {cloneSuccess && (
        <div style={{ margin: '0 16px 12px', padding: '10px 16px', background: 'rgba(34 197 94 / 0.12)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34 197 94 / 0.3)', fontSize: 13, color: 'rgb(var(--color-accent))' }}>
          ✓ {cloneSuccess} added to your routines!
        </div>
      )}

      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: 14, fontSize: 16, borderRadius: 'var(--radius-lg)' }}
          onClick={() => navigate('/routines/new')}
        >
          <Plus size={20} /> Create Routine
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

      {/* ── Program Templates ─────────────────────────────── */}
      <div style={{ padding: '0 16px', marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BookOpen size={18} style={{ color: 'rgb(var(--color-accent))' }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Program Templates</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
          Ready-to-use programs. Clone one to add it to your routines and customize it.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROGRAM_TEMPLATES.map(template => (
            <div
              key={template.id}
              className="card"
              style={{ padding: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{template.name}</div>
                  <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', lineHeight: 1.4 }}>
                    {template.description}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>
                    {template.days.length} routine{template.days.length !== 1 ? 's' : ''}: {template.days.map(d => d.name.split(' — ')[1] ?? d.name).join(', ')}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', flexShrink: 0, fontSize: 13 }}
                  onClick={() => setCloningTemplate(template)}
                >
                  Clone
                </button>
              </div>
            </div>
          ))}
        </div>
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

      {/* ── Clone template confirm ────────────────────────── */}
      <BottomSheet open={!!cloningTemplate} onClose={() => setCloningTemplate(null)} title={cloningTemplate?.name ?? ''}>
        {cloningTemplate && (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>
              {cloningTemplate.description}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
              This will add {cloningTemplate.days.length} routine{cloningTemplate.days.length !== 1 ? 's' : ''} to your library. You can rename and customize them freely.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCloningTemplate(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => void cloneTemplate(cloningTemplate)}>
                Add to my routines
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  )
}
