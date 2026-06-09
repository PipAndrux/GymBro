import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Trophy, Layers2 } from 'lucide-react'
import type { WorkoutSet, SetType } from '../types'
import { unlockAudio } from '../lib/feedback'
import { hasPR, type PRFlags } from '../lib/prs'

const SET_TYPES: SetType[] = ['normal', 'warmup', 'dropset', 'failure']

const SET_TYPE_META: Record<SetType, { label: string; color: string }> = {
  normal:  { label: '',  color: '' },
  warmup:  { label: 'W', color: '#3b82f6' },
  dropset: { label: 'D', color: '#f97316' },
  failure: { label: 'F', color: '#ef4444' },
}

interface SetRowProps {
  set: WorkoutSet
  index: number
  pr?: PRFlags
  lastWeight?: number
  lastReps?: number
  onChange: (patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe' | 'setType'>>) => void
  onToggle: () => void
  onRemove: () => void
  onOpenPlateCalc?: (weight: number) => void
}

const numStr = (n: number | undefined) => (n === undefined || n === 0 ? '' : String(n))

export default function SetRow({ set, index, pr, lastWeight, lastReps, onChange, onToggle, onRemove, onOpenPlateCalc }: SetRowProps) {
  const [weight, setWeight] = useState(() => numStr(set.weight))
  const [reps, setReps] = useState(() => numStr(set.reps))
  const [rpe, setRpe] = useState(() => numStr(set.rpe))
  const done = !!set.completedAt
  const isPR = done && hasPR(pr)
  const prLabel = pr?.e1rm ? 'New 1RM PR' : pr?.weight ? 'Weight PR' : ''

  const currentType: SetType = set.setType ?? 'normal'
  const typeMeta = SET_TYPE_META[currentType]

  const weightPlaceholder = !done && lastWeight ? String(lastWeight) : '0'
  const repsPlaceholder = !done && lastReps ? String(lastReps) : '0'

  function cycleType() {
    const idx = SET_TYPES.indexOf(currentType)
    const next = SET_TYPES[(idx + 1) % SET_TYPES.length]
    onChange({ setType: next })
  }

  return (
    <>
      {isPR && (
        <motion.div
          className="pr-flag"
          initial={{ opacity: 0, scale: 0.7, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 360 }}
        >
          <Trophy size={12} strokeWidth={2.4} /> {prLabel}
        </motion.div>
      )}

      <div className={`set-row${done ? ' set-row-done' : ''}`}>
        {/* Set number / type button — tap to cycle type */}
        <button
          className="set-num"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            color: typeMeta.color || undefined,
            fontWeight: typeMeta.label ? 800 : undefined,
          }}
          onClick={cycleType}
          aria-label={`set type: ${currentType}`}
          title="Tap to change set type"
        >
          {typeMeta.label || (index + 1)}
        </button>

        {/* Weight input + plate calc */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            className="set-input"
            inputMode="decimal"
            placeholder={weightPlaceholder}
            value={weight}
            onChange={e => {
              const v = e.target.value
              setWeight(v)
              const n = parseFloat(v)
              onChange({ weight: isNaN(n) ? 0 : n })
            }}
          />
          {onOpenPlateCalc && (
            <button
              className="icon-btn"
              style={{ position: 'absolute', right: -22, color: 'rgb(var(--color-text-muted))', padding: 2 }}
              onClick={() => onOpenPlateCalc(parseFloat(weight) || 0)}
              aria-label="plate calculator"
              tabIndex={-1}
            >
              <Layers2 size={13} />
            </button>
          )}
        </div>

        <input
          className="set-input"
          inputMode="numeric"
          placeholder={repsPlaceholder}
          value={reps}
          onChange={e => {
            const v = e.target.value
            setReps(v)
            const n = parseInt(v, 10)
            onChange({ reps: isNaN(n) ? 0 : n })
          }}
        />

        <input
          className="set-input"
          inputMode="decimal"
          placeholder="–"
          value={rpe}
          onChange={e => {
            const v = e.target.value
            setRpe(v)
            const n = parseFloat(v)
            onChange({ rpe: isNaN(n) ? undefined : n })
          }}
        />

        <button
          className={`set-check${done ? ' set-check-done' : ''}`}
          onClick={() => {
            unlockAudio()
            onToggle()
          }}
          aria-label={done ? 'mark set incomplete' : 'complete set'}
        >
          <Check size={16} />
        </button>

        <button className="set-remove" onClick={onRemove} aria-label="remove set">
          <X size={15} />
        </button>
      </div>
    </>
  )
}
