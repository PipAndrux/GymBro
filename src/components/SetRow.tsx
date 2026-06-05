import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Trophy } from 'lucide-react'
import type { WorkoutSet } from '../types'
import { unlockAudio } from '../lib/feedback'
import { hasPR, type PRFlags } from '../lib/prs'

interface SetRowProps {
  set: WorkoutSet
  index: number
  pr?: PRFlags
  onChange: (patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>>) => void
  onToggle: () => void
  onRemove: () => void
}

const numStr = (n: number | undefined) => (n === undefined || n === 0 ? '' : String(n))

// The row owns its input strings so partial input ("22.", "") works; it writes
// parsed numbers back to the store on every change (which persists to IndexedDB).
export default function SetRow({ set, index, pr, onChange, onToggle, onRemove }: SetRowProps) {
  const [weight, setWeight] = useState(() => numStr(set.weight))
  const [reps, setReps] = useState(() => numStr(set.reps))
  const [rpe, setRpe] = useState(() => numStr(set.rpe))
  const done = !!set.completedAt
  const isPR = done && hasPR(pr)
  const prLabel = pr?.e1rm ? 'New 1RM PR' : pr?.weight ? 'Weight PR' : ''

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
        <div className="set-num">{index + 1}</div>

        <input
          className="set-input"
          inputMode="decimal"
          placeholder="0"
          value={weight}
          onChange={e => {
            const v = e.target.value
            setWeight(v)
            const n = parseFloat(v)
            onChange({ weight: isNaN(n) ? 0 : n })
          }}
        />

        <input
          className="set-input"
          inputMode="numeric"
          placeholder="0"
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
            unlockAudio() // user gesture — unlocks audio so the rest beep can play later
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
