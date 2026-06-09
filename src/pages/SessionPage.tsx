import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pause, Play, Plus, Trash2, Dumbbell, Info, Flame, Link, Link2Off } from 'lucide-react'
import { useSession } from '../store/sessionStore'
import { useNow } from '../lib/useNow'
import { getLastPerformance, type LastPerformance } from '../lib/history'
import { formatDuration } from '../lib/format'
import { useSettings } from '../lib/settings'
import SetRow from '../components/SetRow'
import ExercisePicker from '../components/ExercisePicker'
import BottomSheet from '../components/BottomSheet'
import PlateCalculatorSheet from '../components/PlateCalculatorSheet'
import WarmupSheet from '../components/WarmupSheet'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import type { Exercise } from '../types'

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
  const addWarmupSets = useSession(s => s.addWarmupSets)
  const updateSet = useSession(s => s.updateSet)
  const toggleSetComplete = useSession(s => s.toggleSetComplete)
  const removeSet = useSession(s => s.removeSet)
  const finishWorkout = useSession(s => s.finishWorkout)
  const discardWorkout = useSession(s => s.discardWorkout)
  const groupExercises = useSession(s => s.groupExercises)
  const ungroupExercise = useSession(s => s.ungroupExercise)
  const prFlags = useSession(s => s.prFlags)

  const { units } = useSettings()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null)

  // Per-exercise sheet state
  const [plateCalcState, setPlateCalcState] = useState<{ open: boolean; weight: number }>({ open: false, weight: 0 })
  const [warmupState, setWarmupState] = useState<{ open: boolean; exerciseUuid: string; weight: number }>({ open: false, exerciseUuid: '', weight: 0 })
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [supersetPickerFor, setSupersetPickerFor] = useState<string | null>(null)

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
    return () => { cancelled = true }
  }, [exercises, workoutUuid])

  const running = !!workout && pauseStartedAt === null
  useNow(running, 1000)

  if (!hydrated) return <div className="page-content" />
  if (!workout) return <Navigate to="/" replace />

  const completedCount = sets.filter(s => s.completedAt).length

  async function doFinish() {
    const finished = await finishWorkout()
    setConfirm(null)
    if (finished) navigate(`/summary/${finished.uuid}`, { replace: true })
    else navigate('/')
  }
  async function doDiscard() {
    await discardWorkout()
    setConfirm(null)
    navigate('/')
  }

  // For warmup "add to workout", pass back weights + reps
  function handleAddWarmupSets(sets: { weight: number; reps: number }[]) {
    void addWarmupSets(
      warmupState.exerciseUuid,
      sets.map(s => s.weight),
      sets.map(s => s.reps)
    )
  }

  // Get the working weight for warmup calc (heaviest set weight, or first set)
  function getWorkingWeight(exerciseUuid: string): number {
    const exSets = sets.filter(s => s.exerciseUuid === exerciseUuid && s.deletedAt === null)
    if (exSets.length === 0) return 0
    return Math.max(...exSets.map(s => s.weight ?? 0))
  }

  // Superset grouping picker: picks the partner for supersetPickerFor
  const supersetCandidates = exercises.filter(e => e.exercise.uuid !== supersetPickerFor)

  return (
    <>
      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Sticky session header */}
        <div style={headerStyle}>
          <div style={{ paddingTop: 'var(--safe-top)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
            <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate('/')} aria-label="back">
              <ChevronLeft size={22} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input className="session-name" value={workout.name} onChange={e => renameWorkout(e.target.value)} aria-label="workout name" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(elapsedMs())}
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
          {exercises.map(({ exercise, restSeconds, supersetGroup }, idx) => {
            const exSets = sets
              .filter(s => s.exerciseUuid === exercise.uuid)
              .sort((a, b) => a.setNumber - b.setNumber)
            const color = MUSCLE_COLORS[exercise.primaryMuscle]
            const inSuperset = !!supersetGroup
            const isLastInGroup = inSuperset && (
              idx === exercises.length - 1 || exercises[idx + 1].supersetGroup !== supersetGroup
            )

            return (
              <div key={exercise.uuid}>
                {/* Superset bracket top */}
                {inSuperset && (exercises[idx - 1]?.supersetGroup !== supersetGroup) && (
                  <div style={supersetBracketTop}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgb(var(--color-accent))' }}>SUPERSET</span>
                  </div>
                )}

                <div
                  className="card"
                  style={{
                    marginBottom: isLastInGroup ? 0 : 12,
                    padding: 14,
                    borderLeft: inSuperset ? `3px solid rgb(var(--color-accent))` : undefined,
                    borderRadius: inSuperset && !isLastInGroup ? '12px 12px 0 0' : inSuperset ? '0 0 12px 12px' : undefined,
                  }}
                >
                  {/* Exercise header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{exercise.name}</div>
                      <span style={{ ...chip, background: `${color}22`, color }}>{exercise.primaryMuscle}</span>
                    </div>
                    {/* Tool buttons */}
                    <button
                      className="icon-btn"
                      title="Exercise info"
                      onClick={() => setDetailExercise(exercise)}
                      aria-label="exercise info"
                    >
                      <Info size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Warm-up calculator"
                      onClick={() => setWarmupState({ open: true, exerciseUuid: exercise.uuid, weight: getWorkingWeight(exercise.uuid) })}
                      aria-label="warm-up calculator"
                    >
                      <Flame size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      title={inSuperset ? 'Remove from superset' : 'Group as superset'}
                      style={{ color: inSuperset ? 'rgb(var(--color-accent))' : undefined }}
                      onClick={() => {
                        if (inSuperset) void ungroupExercise(exercise.uuid)
                        else setSupersetPickerFor(exercise.uuid)
                      }}
                      aria-label={inSuperset ? 'ungroup superset' : 'group as superset'}
                    >
                      {inSuperset ? <Link2Off size={16} /> : <Link size={16} />}
                    </button>
                    <button className="icon-btn" onClick={() => removeExercise(exercise.uuid)} aria-label="remove exercise">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Rest + plate calc row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>Rest</span>
                    <button className="rest-step" onClick={() => setExerciseRest(exercise.uuid, restSeconds - 15)}>−15</button>
                    <span style={{ fontWeight: 600, minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtRest(restSeconds)}
                    </span>
                    <button className="rest-step" onClick={() => setExerciseRest(exercise.uuid, restSeconds + 15)}>+15</button>
                  </div>

                  {/* Set table */}
                  <div className="set-head">
                    <div style={{ textAlign: 'center' }}>SET</div>
                    <div style={{ textAlign: 'center' }}>{units.toUpperCase()}</div>
                    <div style={{ textAlign: 'center' }}>REPS</div>
                    <div style={{ textAlign: 'center' }}>RPE</div>
                    <div />
                    <div />
                  </div>

                  {exSets.map((s, i) => {
                    const perf = lastPerf[exercise.uuid]
                    return (
                      <SetRow
                        key={s.uuid}
                        set={s}
                        index={i}
                        pr={prFlags[s.uuid]}
                        lastWeight={perf?.weight}
                        lastReps={perf?.reps}
                        onChange={patch => updateSet(s.uuid, patch)}
                        onToggle={() => toggleSetComplete(s.uuid)}
                        onRemove={() => removeSet(s.uuid)}
                        onOpenPlateCalc={w => setPlateCalcState({ open: true, weight: w })}
                      />
                    )
                  })}

                  <button className="add-set" onClick={() => addSet(exercise.uuid)}>
                    <Plus size={16} /> Add set
                  </button>
                </div>

                {/* Superset connector between grouped exercises */}
                {inSuperset && !isLastInGroup && (
                  <div style={supersetConnector} />
                )}
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
            style={{ width: '100%', marginTop: exercises.length === 0 ? 8 : 16 }}
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

      {/* ── Sheets ─────────────────────────────────────────────────── */}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={sel => { setPickerOpen(false); void addExercises(sel) }}
        excludeUuids={exercises.map(e => e.exercise.uuid)}
        title="Add Exercises"
        confirmLabel="Add"
      />

      <PlateCalculatorSheet
        open={plateCalcState.open}
        onClose={() => setPlateCalcState(s => ({ ...s, open: false }))}
        initialWeight={plateCalcState.weight}
      />

      <WarmupSheet
        open={warmupState.open}
        onClose={() => setWarmupState(s => ({ ...s, open: false }))}
        workingWeight={warmupState.weight}
        units={units}
        onAddSets={handleAddWarmupSets}
      />

      <ExerciseDetailSheet
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
        exercise={detailExercise}
      />

      {/* Superset partner picker */}
      <BottomSheet
        open={supersetPickerFor !== null}
        onClose={() => setSupersetPickerFor(null)}
        title="Group as Superset"
      >
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
          Select the exercise to pair with:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {supersetCandidates.map(({ exercise }) => (
            <button
              key={exercise.uuid}
              className="pick-row"
              onClick={() => {
                if (supersetPickerFor) {
                  void groupExercises(supersetPickerFor, exercise.uuid)
                  setSupersetPickerFor(null)
                }
              }}
            >
              <span style={{ fontWeight: 600 }}>{exercise.name}</span>
            </button>
          ))}
          {supersetCandidates.length === 0 && (
            <p style={{ textAlign: 'center', color: 'rgb(var(--color-text-muted))', fontSize: 14, padding: '16px 0' }}>
              Add more exercises first.
            </p>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={confirm === 'finish'} onClose={() => setConfirm(null)} title="Finish workout?">
        <p style={{ margin: '0 0 16px', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>
          Your {completedCount} completed set{completedCount !== 1 ? 's' : ''} will be saved to history. Empty sets are discarded.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(null)}>Keep going</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={doFinish}>Finish</button>
        </div>
      </BottomSheet>

      <BottomSheet open={confirm === 'discard'} onClose={() => setConfirm(null)} title="Discard workout?">
        <p style={{ margin: '0 0 16px', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>
          This permanently deletes this session and all its sets. This can't be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirm(null)}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: '#ef4444', color: '#fff', padding: '12px 20px' }} onClick={doDiscard}>
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

const supersetBracketTop: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 0',
  background: 'rgba(34 197 94 / 0.08)',
  borderRadius: '8px 8px 0 0',
  marginBottom: 0,
}

const supersetConnector: React.CSSProperties = {
  height: 2,
  background: 'rgba(34 197 94 / 0.4)',
  marginLeft: 14,
  marginRight: 14,
}
