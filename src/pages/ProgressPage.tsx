import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getWeeklyVolume, getExercisesWithData } from '../lib/prs'
import { useSettings } from '../lib/settings'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import { formatDateLong } from '../lib/format'
import { CHART_GREEN as GREEN, CHART_MUTED as MUTED, CHART_GRID, tooltipStyle } from '../lib/chartTheme'

function fmtK(v: number): string {
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`
  return String(Math.round(v))
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const { units } = useSettings()
  const data = useLiveQuery(() => Promise.all([getWeeklyVolume(10), getExercisesWithData()]), [])
  const weekly = data?.[0] ?? null
  const exercises = data?.[1] ?? null

  const hasVolume = !!weekly && weekly.some(w => w.volume > 0)
  const maxVolIdx = weekly ? weekly.reduce((mi, w, i, arr) => (w.volume > arr[mi].volume ? i : mi), 0) : 0

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate('/')} aria-label="back">
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700 }}>Progress</h1>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Weekly volume */}
        <div>
          <div className="section-title" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={13} /> Weekly Volume
          </div>
          <div className="card" style={{ padding: '16px 8px 8px' }}>
            {hasVolume ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={36} tickFormatter={fmtK} />
                    <Tooltip
                      cursor={{ fill: 'rgba(34,197,94,0.08)' }}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: MUTED, fontSize: 11, marginBottom: 2 }}
                      formatter={(value) => [`${Math.round(Number(value)).toLocaleString()} ${units}`, 'Volume']}
                    />
                    <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                      {(weekly ?? []).map((_, i) => (
                        <Cell key={i} fill={i === maxVolIdx ? GREEN : 'rgba(34,197,94,0.45)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <BarChart3 size={32} strokeWidth={1.5} />
                <p>Finish a workout and your weekly volume will chart here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Per-exercise list */}
        <div>
          <div className="section-title" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={13} /> Exercises
          </div>
          {!exercises ? (
            <div className="card"><div className="empty-state" style={{ padding: 20 }}><p>Loading…</p></div></div>
          ) : exercises.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '28px 16px' }}>
                <TrendingUp size={32} strokeWidth={1.5} />
                <p>Complete some sets to start tracking strength progress per exercise.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map(ex => {
                const color = MUSCLE_COLORS[ex.primaryMuscle]
                return (
                  <button
                    key={ex.exerciseUuid}
                    className="card nav-card"
                    style={{ padding: '12px 14px', gap: 12 }}
                    onClick={() => navigate(`/progress/${ex.exerciseUuid}`)}
                  >
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 1 }}>
                        {ex.sessions} session{ex.sessions !== 1 ? 's' : ''} · last {formatDateLong(ex.lastDate)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                        {ex.bestE1RM}<span style={{ fontSize: 11, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}> {units}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'rgb(var(--color-text-muted))', letterSpacing: '0.05em' }}>BEST e1RM</div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
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
