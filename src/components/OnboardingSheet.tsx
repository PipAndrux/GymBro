import { useState } from 'react'
import { Dumbbell, Scale, ChevronRight } from 'lucide-react'
import { setSetting, type Unit } from '../lib/settings'
import { db, measurementUuidForType } from '../db'
import type { Measurement, MeasurementEntry } from '../types'

const SETUP_KEY = 'gymbro_setup_v1'

export function isSetupDone(): boolean {
  return !!localStorage.getItem(SETUP_KEY)
}

export function markSetupDone() {
  localStorage.setItem(SETUP_KEY, '1')
}

interface Props {
  onDone: () => void
}

type Step = 'units' | 'weight' | 'done'

export default function OnboardingSheet({ onDone }: Props) {
  const [step, setStep] = useState<Step>('units')
  const [unit, setUnit] = useState<Unit>('kg')
  const [bodyWeight, setBodyWeight] = useState('')

  async function handleUnits(u: Unit) {
    setUnit(u)
    await setSetting('units', u)
    setStep('weight')
  }

  async function handleWeight() {
    const val = parseFloat(bodyWeight)
    if (!isNaN(val) && val > 0) {
      const now = Date.now()
      const today = new Date()
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const weightMeasurement: Measurement = {
        uuid: measurementUuidForType('weight'),
        type: 'weight', label: 'Body Weight',
        unit: unit === 'lb' ? 'lb' : 'kg',
        isCustom: false, sortOrder: 0,
        updatedAt: now, deletedAt: null,
      }
      await db.measurements.put(weightMeasurement)

      const entry: MeasurementEntry = {
        uuid: crypto.randomUUID(),
        measurementUuid: weightMeasurement.uuid,
        value: val, date,
        createdAt: now, updatedAt: now, deletedAt: null,
      }
      await db.measurementEntries.add(entry)
    }
    setStep('done')
  }

  function finish() {
    markSetupDone()
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0 0 0 / 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', padding: '0 0 var(--safe-bottom)',
    }}>
      <div style={{
        width: '100%', background: 'rgb(var(--color-surface))',
        borderRadius: '20px 20px 0 0', borderTop: '1px solid rgb(var(--color-border))',
        padding: '28px 24px 32px',
      }}>
        {step === 'units' && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34 197 94 / 0.15)', border: '1.5px solid rgba(34 197 94 / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dumbbell size={22} color="rgb(var(--color-accent))" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Welcome to GymBro</div>
                <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>Quick setup — takes 30 seconds</div>
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Which weight unit do you use?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['kg', 'lb'] as Unit[]).map(u => (
                <button
                  key={u}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '16px 0', fontSize: 18, fontWeight: 800 }}
                  onClick={() => void handleUnits(u)}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12, fontSize: 13, color: 'rgb(var(--color-text-muted))' }} onClick={finish}>
              Skip setup
            </button>
          </>
        )}

        {step === 'weight' && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34 197 94 / 0.15)', border: '1.5px solid rgba(34 197 94 / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={22} color="rgb(var(--color-accent))" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Body weight</div>
                <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>Optional — track your progress over time</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder={unit === 'kg' ? '75' : '165'}
                value={bodyWeight}
                onChange={e => setBodyWeight(e.target.value)}
                autoFocus
                style={{ flex: 1, fontSize: 20, fontWeight: 700, textAlign: 'center', padding: '14px' }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}>{unit}</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, gap: 8 }}
              onClick={() => void handleWeight()}
            >
              Continue <ChevronRight size={18} />
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10, fontSize: 13, color: 'rgb(var(--color-text-muted))' }} onClick={() => setStep('done')}>
              Skip for now
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💪</div>
            <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You're all set!</div>
            <div style={{ fontSize: 14, color: 'rgb(var(--color-text-muted))', marginBottom: 28, lineHeight: 1.5 }}>
              Log your first workout to get started. Everything syncs automatically when you sign in.
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 700 }} onClick={finish}>
              Start training
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
