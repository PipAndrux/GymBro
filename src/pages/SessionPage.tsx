import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pause, Play, Plus, Trash2, Dumbbell } from 'lucide-react'
import { useSession } from '../store/sessionStore'
import { useNow } from '../lib/useNow'
import { getLastPerformance, type LastPerformance } from '../lib/history'
import SetRow from '../components/SetRow'
import ExercisePicker from '../components/ExercisePicker'
import BottomSheet from '../components/BottomSheet'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'

function fmtDur(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function fmtRest(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`
}

export default function SessionPage() {
  const navigate = useNavigate()
  const hydrated = useSession(s => s.hydrated)
  const workout = useSession(s => s.workout)
  const exercises = useSession(s => s.exercises)
  const sets = useSession(s => s.sets)
  const pauseStartedAt = useSession(s => s.pauseStartedAt)
  const elapsedMs = useSession(s => s.elapsedMs)
  const togglePause = useSession(s => s.togglePause)
  const renameWorkout = useSession(s => s.renameWorkout)
  const addExercises = useSession(s => s.addExercises)
  const removeExercise = useSession(s => s.removeExercise)
  const setExerciseRest = useSession(s => s.setExerciseRest)
  const addSet = useSession(s => s.addSet)
  const updateSet = useSession(s => s.updateSet)
  const toggleSetComplete = useSession(s => s.toggleSetComplete)
  const removeSet = useSession(s => s.removeSet)
  const finishWorkout = useSession(s => s.finishWorkout)
  const discardWorkout = useSession(s => s.discardWorkout)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null)

  // Last-used weight/reps per exercise (from prior workouts) — "what to beat".
  const [lastPerf, setLastPerf] = useState<Record<string, LastPerformance | null>>({})
  const workoutUuid = workout?.uuid
  useEffect(() => {
    if (!workoutUuid) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        exercises.map(
          async ({ exercise }) => [exercise.uuid, await getLastPerformance(exercise.uuid, workoutUuid)] as const
        )
      )
      if (!cancelled) setLastPerf(Object.fromEntries(entries))
    })()
    return () => {
      cancelled = true
    }
  }, [exercises, workoutUuid])

  const running = !!workout && pauseStartedAt === null
  // Tick the elapsed-time display once per second while running (no return value needed —
  // the hook's internal state change re-renders this component).
  useNow(running, 1000)

  // Wait for the one-time resume hydration before deciding there's no active workout,
  // otherwise reloading directly on /session would bounce to home.
  if (!hydrated) return <div className="page-content" />
  if (!workout) return <Navigate to="/" replace />

  const completedCount = sets.filter(s => s.completedAt).length

  async function doFinish() {
    await finishWorkout()
    setConfirm(null)
    navigate('/')
  }
  async function doDiscard() {
    await discardWorkout()
    setConfirm(null)
    navigate('/')
  }

  return (
    <>
      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Sticky session header */}
        <div style={headerStyle}>
          <div style={{ paddingTop: 'var(--safe-top)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
            <button
              className="btn btn-ghost"
              style={{ padding: '8px 4px', marginLeft: -4 }}
              onClick={() => navigate('/')}
              aria-label="back"
            >
              <ChevronLeft size={22} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                className="session-name"
                value={workout.name}
                onChange={e => renameWorkout(e.target.value)}
                aria-label="workout name"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDur(elapsedMs())}
                </span>
                <button className="timer-pause" onClick={togglePause}>
                  {running ? <Pause size={13} /> : <Play size={13} />}
                  {running ? 'Pause' : 'Paused'}
                </button>
                <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>
                  {completedCount} set{completedCount !== 1 ? 's' : ''} done
                </span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={() => setConfirm('finish')}>
              Finish
            </button>
          </div>
        </div>

        {/* Exercises */}
        <div style={{ padding: '12px 12px 0' }}>
          {exercises.map(({ exercise, restSeconds }) => {
            const exSets = sets
              .filter(s => s.exerciseUuid === exercise.uuid)
              .sort((a, b) => a.setNumber - b.setNumber)
            const color = MUSCLE_COLORS[exercise.primaryMuscle]
            return (
              <div key={exercise.uuid} className="card" style={{ marginBottom: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{exercise.name}</div>
                    <span style={{ ...chip, background: `${color}22`, color }}>{exercise.primaryMuscle}</span>
                    {lastPerf[exercise.uuid] && (
                      <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>
                        Last: {lastPerf[exercise.uuid]!.weight} kg × {lastPerf[exercise.uuid]!.reps}
                      </div>
                    )}
                  </div>
                  <button className="icon-btn" onClick={() => removeExercise(exercise.uuid)} aria-label="remove exercise">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Per-exercise rest duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>Rest</span>
                  <button className="rest-step" onClick={() => setExerciseRest(exercise.uuid, restSeconds - 15)}>
                    −15
                  </button>
                  <span style={{ fontWeight: 600, minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtRest(restSeconds)}
                  </span>
                  <button className="rest-step" onClick={() => setExerciseRest(exercise.uuid, restSeconds + 15)}>
                    +15
                  </button>
                </div>

                {/* Set table */}
                <div className="set-head">
                  <div style={{ textAlign: 'center' }}>SET</div>
                  <div style={{ textAlign: 'center' }}>KG</div>
                  <div style={{ textAlign: 'center' }}>REPS</div>
                  <div style={{ textAlign: 'center' }}>RPE</div>
                  <div />
                  <div />
                </div>

                {exSets.map((s, i) => (
                  <SetRow
                    key={s.uuid}
                    set={s}
                    index={i}
                    onChange={patch => updateSet(s.uuid, patch)}
                    onToggle={() => toggleSetComplete(s.uuid)}
                    onRemove={() => removeSet(s.uuid)}
                  />
                ))}

                <button className="add-set" onClick={() => addSet(exercise.uuid)}>
                  <Plus size={16} /> Add set
                </button>
              </div>
            )
          })}

          {exercises.length === 0 && (
            <div className="empty-state" style={{ paddingTop: 36 }}>
              <Dumbbell size={40} strokeWidth={1.5} />
              <p>No exercises yet. Add one to start logging.</p>
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: exercises.length === 0 ? 8 : 4 }}
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={18} /> Add Exercise
          </button>

          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8, color: '#ef4444' }}
            onClick={() => setConfirm('discard')}
          >
            Discard Workout
          </button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={sel => {
          setPickerOpen(false)
          void addExercises(sel)
        }}
        excludeUuids={exercises.map(e => e.exercise.uuid)}
        title="Add Exercises"
        confirmLabel="Add"
      />

      <BottomSheet open={confirm === 'finish'} onClose={() => setConfirm(null)} title="Finish workout?">
        <p style={{ margin: '0 0 16px', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>
          Your {completedCount} completed set{completedCount !== 1 ? 's' : ''} will be saved to history. Empty sets are
          discarded.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(null)}>
            Keep going
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={doFinish}>
            Finish
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={confirm === 'discard'} onClose={() => setConfirm(null)} title="Discard workout?">
        <p style={{ margin: '0 0 16px', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>
          This permanently deletes this session and all its sets. This can't be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: '#ef4444', color: '#fff', padding: '12px 20px' }}
            onClick={doDiscard}
          >
            Discard
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}

const chip: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 4,
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 7px',
  borderRadius: 100,
  textTransform: 'capitalize',
}
