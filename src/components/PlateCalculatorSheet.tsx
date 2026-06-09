import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { useSettings } from '../lib/settings'

interface Props {
  open: boolean
  onClose: () => void
  /** Pre-filled target weight (the current set's weight). */
  initialWeight?: number
}

function calcPlates(target: number, barWeight: number, available: number[]): number[] {
  const perSide = (target - barWeight) / 2
  if (perSide <= 0) return []
  const sorted = [...available].sort((a, b) => b - a)
  const result: number[] = []
  let remaining = Math.round(perSide * 1000) / 1000
  for (const plate of sorted) {
    while (remaining >= plate - 0.001) {
      result.push(plate)
      remaining = Math.round((remaining - plate) * 1000) / 1000
    }
  }
  return result
}

function PlateVisual({ plates, unit }: { plates: number[]; unit: string }) {
  if (plates.length === 0) return <p style={{ color: 'rgb(var(--color-text-muted))', textAlign: 'center', fontSize: 14 }}>Bar only</p>

  const plateColors: Record<number, string> = {
    25: '#ef4444', 20: '#3b82f6', 15: '#eab308', 10: '#22c55e',
    5: '#a855f7', 2.5: '#f97316', 1.25: '#94a3b8', 1: '#64748b',
    // lb equivalents
    45: '#ef4444', 35: '#3b82f6', 10.5: '#eab308', 2.27: '#94a3b8',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
        {/* Bar stub */}
        <div style={{ width: 24, height: 10, background: 'rgb(var(--color-surface-2))', borderRadius: 3, border: '1px solid rgb(var(--color-border))' }} />
        {/* Plates */}
        {plates.map((p, i) => {
          const color = plateColors[p] ?? '#94a3b8'
          const height = Math.max(28, Math.min(56, p * 2 + 14))
          return (
            <div
              key={i}
              style={{
                width: 22,
                height,
                borderRadius: 4,
                background: `${color}33`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color,
                writingMode: 'vertical-rl',
              }}
            >
              {p}
            </div>
          )
        })}
        {/* Bar end */}
        <div style={{ width: 12, height: 10, background: 'rgb(var(--color-surface-2))', borderRadius: 3, border: '1px solid rgb(var(--color-border))' }} />
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
        Per side: {plates.join(' + ')} {unit}
      </div>
    </div>
  )
}

export default function PlateCalculatorSheet({ open, onClose, initialWeight = 0 }: Props) {
  const { barWeight, plateWeightsKg, units } = useSettings()
  const [target, setTarget] = useState(() => String(initialWeight || barWeight))
  const [bar, setBar] = useState(() => String(barWeight))

  const targetNum = parseFloat(target) || 0
  const barNum = parseFloat(bar) || 0
  const plates = calcPlates(targetNum, barNum, plateWeightsKg)
  const remainder = Math.round(((targetNum - barNum) / 2 - plates.reduce((s, p) => s + p, 0)) * 1000) / 1000

  return (
    <BottomSheet open={open} onClose={onClose} title="Plate Calculator">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Target weight ({units})</label>
          <input
            className="input"
            inputMode="decimal"
            value={target}
            onChange={e => setTarget(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Bar weight ({units})</label>
          <input
            className="input"
            inputMode="decimal"
            value={bar}
            onChange={e => setBar(e.target.value)}
          />
        </div>
      </div>

      <div style={{ background: 'rgb(var(--color-surface))', borderRadius: 'var(--radius-md)', padding: '20px 16px', marginBottom: 12, border: '1px solid rgb(var(--color-border))' }}>
        <PlateVisual plates={plates} unit={units} />
      </div>

      {remainder > 0.01 && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#f97316', marginBottom: 12 }}>
          ⚠️ Can't load exactly — {remainder} {units} remainder
        </p>
      )}

      {targetNum > 0 && targetNum <= barNum && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgb(var(--color-text-muted))', marginBottom: 12 }}>
          Target must be greater than bar weight
        </p>
      )}

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
    </BottomSheet>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgb(var(--color-text-muted))',
  marginBottom: 6,
}
