import BottomSheet from './BottomSheet'
import { useSettings } from '../lib/settings'
import { Flame } from 'lucide-react'

interface WarmupSet {
  label: string
  weight: number
  reps: number
}

function round(w: number): number {
  return Math.round(w / 2.5) * 2.5
}

function buildWarmupSets(workingWeight: number, barWeight: number): WarmupSet[] {
  const sets: WarmupSet[] = []
  const targets = [
    { pct: 0.4, reps: 8, label: '40%' },
    { pct: 0.6, reps: 5, label: '60%' },
    { pct: 0.8, reps: 3, label: '80%' },
  ]
  for (const t of targets) {
    const raw = workingWeight * t.pct
    const w = Math.max(barWeight, round(raw))
    sets.push({ label: t.label, weight: w, reps: t.reps })
  }
  return sets
}

interface Props {
  open: boolean
  onClose: () => void
  workingWeight: number
  units: string
  /** Optional: add the warmup sets to the exercise in the session. */
  onAddSets?: (sets: WarmupSet[]) => void
}

export default function WarmupSheet({ open, onClose, workingWeight, units, onAddSets }: Props) {
  const { barWeight } = useSettings()
  const sets = buildWarmupSets(workingWeight, barWeight)

  return (
    <BottomSheet open={open} onClose={onClose} title="Warm-up Calculator">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'rgb(var(--color-text-muted))', fontSize: 13 }}>
        <Flame size={16} style={{ color: '#f97316' }} />
        Working weight: <strong style={{ color: 'rgb(var(--color-text))' }}>{workingWeight} {units}</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {sets.map(s => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgb(var(--color-surface))',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <span style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', fontWeight: 600, minWidth: 36 }}>{s.label}</span>
            <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{s.weight}</span>
            <span style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>{units}</span>
            <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>×{s.reps}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginBottom: 16, lineHeight: 1.5 }}>
        Weights rounded to nearest 2.5 {units}. Minimum is bar weight ({barWeight} {units}).
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        {onAddSets && (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => { onAddSets(sets); onClose() }}
          >
            Add to workout
          </button>
        )}
        <button
          className="btn btn-secondary"
          style={{ flex: onAddSets ? 1 : undefined, width: onAddSets ? undefined : '100%' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </BottomSheet>
  )
}
