import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Trophy, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../db'
import { getExerciseE1RMSeries, getExerciseRepMaxes } from '../lib/prs'
import { useSettings } from '../lib/settings'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import { CHART_GREEN as GREEN, CHART_MUTED as MUTED, CHART_GRID, tooltipStyle } from '../lib/chartTheme'

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ExerciseProgressPage() {
  const navigate = useNavigate()
  const { exerciseUuid } = useParams<{ exerciseUuid: string }>()
  const { units } = useSettings()

  const data = useLiveQuery(async () => {
    if (!exerciseUuid) return null
    const [ex, series, repMaxes] = await Promise.all([
      db.exercises.get(exerciseUuid),
      getExerciseE1RMSeries(exerciseUuid),
      getExerciseRepMaxes(exerciseUuid),
    ])
    return { exercise: ex ?? null, series, repMaxes }
  }, [exerciseUuid])

  const exercise = data === undefined ? undefined : data?.exercise ?? null
  const series = data?.series ?? []
  const repMaxes = data?.repMaxes ?? []

  const color = exercise ? MUSCLE_COLORS[exercise.primaryMuscle] : GREEN
  const chartData = series.map(p => ({ label: shortDate(p.date), e1rm: p.e1rm }))
  const bestE1RM = series.reduce((m, p) => Math.max(m, p.e1rm), 0)
  const firstE1RM = series.length ? series[0].e1rm : 0
  const gain = bestE1RM - firstE1RM

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate(-1)} aria-label="back">
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exercise?.name ?? 'Exercise'}
          </h1>
        </div>
      </div>

      {exercise === undefined ? (
        <div className="empty-state" style={{ paddingTop: 60 }}><p>Loading…</p></div>
      ) : exercise === null ? (
        <div className="empty-state" style={{ paddingTop: 60 }}><p>Exercise not found.</p></div>
      ) : series.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <TrendingUp size={36} strokeWidth={1.5} />
          <p>No completed sets logged for this exercise yet.</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Headline */}
          <div className="card" style={{ padding: 16, display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))' }}>
                Best e1RM
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {bestE1RM}<span style={{ fontSize: 14, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}> {units}</span>
              </div>
            </div>
            {gain > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))' }}>
                  Gain
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>
                  +{Math.round(gain * 10) / 10}
                </div>
              </div>
            )}
          </div>

          {/* e1RM line chart */}
          <div>
            <div className="section-title" style={{ padding: 0 }}>Estimated 1RM over time</div>
            <div className="card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={36} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: MUTED, fontSize: 11, marginBottom: 2 }}
                      formatter={(value) => [`${Number(value)} ${units}`, 'e1RM']}
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Rep-max PR table */}
          <div>
            <div className="section-title" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={13} style={{ color: 'rgb(var(--color-accent-amber))' }} /> Rep Maxes
            </div>
            <div className="card" style={{ padding: '4px 14px' }}>
              {repMaxes.map((rm, i) => (
                <div
                  key={rm.reps}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0',
                    borderTop: i === 0 ? 'none' : '1px solid rgb(var(--color-border))',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}>
                    {rm.reps} rep{rm.reps !== 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {rm.weight}<span style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}> {units}</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))', minWidth: 78, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      e1RM {rm.e1rm}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}
