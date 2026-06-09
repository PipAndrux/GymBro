import BottomSheet from './BottomSheet'
import type { Exercise } from '../types'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import { getExerciseInfo } from '../lib/exerciseInstructions'

interface Props {
  open: boolean
  onClose: () => void
  exercise: Exercise | null
}

const MuscleChip = ({ muscle, primary }: { muscle: string; primary?: boolean }) => {
  const color = MUSCLE_COLORS[muscle as keyof typeof MUSCLE_COLORS] ?? '#94a3b8'
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 12,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 100,
      background: primary ? `${color}22` : 'rgb(var(--color-surface-2))',
      color: primary ? color : 'rgb(var(--color-text-muted))',
      textTransform: 'capitalize',
      border: primary ? `1px solid ${color}44` : '1px solid rgb(var(--color-border))',
    }}>
      {muscle}
    </span>
  )
}

export default function ExerciseDetailSheet({ open, onClose, exercise }: Props) {
  if (!exercise) return null
  const info = getExerciseInfo(exercise.uuid)

  return (
    <BottomSheet open={open} onClose={onClose} title={exercise.name}>
      {/* Equipment + category */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
          background: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text-muted))',
          textTransform: 'capitalize', border: '1px solid rgb(var(--color-border))',
        }}>
          {exercise.equipment}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
          background: 'rgb(var(--color-surface-2))', color: 'rgb(var(--color-text-muted))',
          textTransform: 'capitalize', border: '1px solid rgb(var(--color-border))',
        }}>
          {exercise.category}
        </span>
      </div>

      {/* Muscles */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8 }}>
          Muscles
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <MuscleChip muscle={exercise.primaryMuscle} primary />
          {exercise.secondaryMuscles.map(m => (
            <MuscleChip key={m} muscle={m} />
          ))}
          {exercise.secondaryMuscles.length === 0 && (
            <span style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>Primary only</span>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8 }}>
          How to perform
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'rgb(var(--color-text))' }}>
          {info?.instructions ?? 'No instructions available for this exercise. Use proper form, full range of motion, and control the weight throughout.'}
        </p>
      </div>

      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Close</button>
    </BottomSheet>
  )
}
