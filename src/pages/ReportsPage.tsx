import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Share2, Dumbbell, Clock, TrendingUp, Utensils } from 'lucide-react'
import { getPeriodStats, weekRange, monthRange } from '../lib/reports'
import { useSettings } from '../lib/settings'

type Period = 'week' | 'month'

function fmtVol(v: number, units: string): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k ${units}`
  return `${Math.round(v)} ${units}`
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { units } = useSettings()
  const [period, setPeriod] = useState<Period>('week')

  const stats = useLiveQuery(async () => {
    const [start, end] = period === 'week' ? weekRange() : monthRange()
    return getPeriodStats(start, end)
  }, [period])

  const periodLabel = period === 'week' ? 'This Week' : 'This Month'

  async function handleShare() {
    if (!stats) return
    const lines = [
      `GymBro — ${periodLabel}`,
      `Workouts: ${stats.workoutCount}`,
      `Volume: ${fmtVol(stats.totalVolumeKg, units)}`,
      stats.totalDurationMs > 0 ? `Time trained: ${fmtDuration(stats.totalDurationMs)}` : null,
      stats.topExercises.length > 0
        ? `Top exercise: ${stats.topExercises[0].name}`
        : null,
      stats.avgDailyCalories > 0
        ? `Avg daily calories: ${Math.round(stats.avgDailyCalories)} kcal`
        : null,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      await navigator.share({ title: `GymBro ${periodLabel}`, text: lines })
    } else {
      await navigator.clipboard.writeText(lines)
      alert('Summary copied to clipboard!')
    }
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate('/progress')}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700 }}>Reports</h1>
          <button className="btn btn-ghost" style={{ padding: '8px 12px', gap: 6, fontSize: 14 }} onClick={() => void handleShare()}>
            <Share2 size={16} />
          </button>
        </div>
        {/* Period toggle */}
        <div style={{ display: 'flex', padding: '0 16px 10px', gap: 6 }}>
          {(['week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                background: period === p ? 'rgba(34 197 94 / 0.15)' : 'rgb(var(--color-surface))',
                color: period === p ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
                transition: 'all 0.15s ease',
              }}
            >
              {p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!stats ? (
          <div className="card"><div className="empty-state" style={{ padding: 24 }}><p>Loading…</p></div></div>
        ) : stats.workoutCount === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <Dumbbell size={36} strokeWidth={1.5} />
              <p>No workouts logged {period === 'week' ? 'this week' : 'this month'} yet.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Key stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard
                icon={<Dumbbell size={18} />}
                label="Workouts"
                value={String(stats.workoutCount)}
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="Volume"
                value={fmtVol(stats.totalVolumeKg, units)}
              />
              {stats.totalDurationMs > 0 && (
                <StatCard
                  icon={<Clock size={18} />}
                  label="Time Trained"
                  value={fmtDuration(stats.totalDurationMs)}
                />
              )}
              {stats.avgDailyCalories > 0 && (
                <StatCard
                  icon={<Utensils size={18} />}
                  label="Avg Daily Kcal"
                  value={Math.round(stats.avgDailyCalories).toLocaleString()}
                />
              )}
            </div>

            {/* Top exercises */}
            {stats.topExercises.length > 0 && (
              <div>
                <div className="section-title" style={{ padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} /> Top Exercises
                </div>
                <div className="card" style={{ padding: 0 }}>
                  {stats.topExercises.map((ex, i) => (
                    <div
                      key={ex.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px',
                        borderTop: i > 0 ? '1px solid rgb(var(--color-border))' : 'none',
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: i === 0 ? 'rgba(234 179 8 / 0.2)' : i === 1 ? 'rgba(148 163 184 / 0.2)' : 'rgba(217 119 6 / 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800,
                        color: i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : '#d97706',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 1 }}>{ex.sets} sets</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {fmtVol(ex.volume, units)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Measurement deltas */}
            {stats.measurementDeltas.length > 0 && (
              <div>
                <div className="section-title" style={{ padding: 0, marginBottom: 8 }}>Body Changes</div>
                <div className="card" style={{ padding: 0 }}>
                  {stats.measurementDeltas.map((d, i) => {
                    const delta = d.endValue - d.startValue
                    const isPositive = delta > 0
                    return (
                      <div
                        key={d.label}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderTop: i > 0 ? '1px solid rgb(var(--color-border))' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{d.label}</span>
                        <span style={{
                          fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: Math.abs(delta) < 0.01 ? 'rgb(var(--color-text-muted))' : isPositive ? '#ef4444' : '#22c55e',
                        }}>
                          {delta > 0.005 ? '+' : ''}{Math.round(delta * 10) / 10} {d.unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ color: 'rgb(var(--color-accent))', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginTop: 4 }}>{label}</div>
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}
