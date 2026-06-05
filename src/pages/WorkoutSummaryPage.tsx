import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Clock, Dumbbell, Layers, CheckCircle2, Share2, Home } from 'lucide-react'
import { getWorkoutSummary } from '../lib/prs'
import { formatDurationShort, formatVolume, formatDateLong } from '../lib/format'
import { useSettings } from '../lib/settings'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import { playFanfare } from '../lib/feedback'

export default function WorkoutSummaryPage() {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const { units } = useSettings()
  const summary = useLiveQuery(() => (uuid ? getWorkoutSummary(uuid) : Promise.resolve(null)), [uuid])

  // Celebrate once the summary loads and there are PRs to celebrate.
  const prCount = summary?.prs.length ?? 0
  useEffect(() => {
    if (prCount > 0) playFanfare()
  }, [prCount])

  async function handleShare() {
    if (!summary) return
    const lines = [
      `💪 ${summary.workout.name}`,
      `${formatDurationShort(summary.durationMs)} · ${formatVolume(summary.volume, units)} · ${summary.setCount} sets`,
      ...summary.prs.map(p => `🏆 PR — ${p.exerciseName}: ${p.weight}${units} × ${p.reps}`),
      '— tracked with GymBro',
    ]
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'GymBro Workout', text })
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        alert('Summary copied to clipboard')
      }
    } catch {
      /* user cancelled share — ignore */
    }
  }

  if (summary === undefined) {
    return <div className="page-content" />
  }
  if (summary === null) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <p>This workout could not be found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 4 }}
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 220, delay: 0.1 }}
            style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(34 197 94 / 0.14)',
            }}
          >
            <CheckCircle2 size={40} style={{ color: 'rgb(var(--color-accent))' }} strokeWidth={2.2} />
          </motion.div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Workout Complete</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>
            {summary.workout.name} · {formatDateLong(summary.workout.startedAt)}
          </p>
        </motion.div>

        {/* Stat grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
          className="card"
          style={{ padding: 18 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Stat icon={<Clock size={16} />} label="Duration" value={formatDurationShort(summary.durationMs)} />
            <Stat icon={<Dumbbell size={16} />} label="Volume" value={formatVolume(summary.volume, units)} />
            <Stat icon={<CheckCircle2 size={16} />} label="Sets" value={String(summary.setCount)} />
            <Stat icon={<Layers size={16} />} label="Exercises" value={String(summary.exerciseCount)} />
          </div>

          {summary.muscleGroups.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
              {summary.muscleGroups.map(m => {
                const color = MUSCLE_COLORS[m]
                return (
                  <span key={m} style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                    textTransform: 'capitalize', background: `${color}22`, color,
                  }}>
                    {m}
                  </span>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* PRs */}
        {summary.prs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.25 }}
          >
            <div className="section-title" style={{ padding: 0, marginBottom: 8, color: 'rgb(var(--color-accent-amber))' }}>
              🏆 {summary.prs.length} New Personal Record{summary.prs.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {summary.prs.map((pr, i) => (
                <motion.div
                  key={`${pr.exerciseUuid}-${pr.reps}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="card"
                  style={{
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    border: '1px solid rgba(245 158 11 / 0.4)',
                    background: 'linear-gradient(100deg, rgba(245 158 11 / 0.10), rgb(var(--color-surface)))',
                  }}
                >
                  <Trophy size={20} style={{ color: 'rgb(var(--color-accent-amber))', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{pr.exerciseName}</div>
                    <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>
                      {pr.kind === 'e1rm' ? 'New estimated 1RM' : 'New rep-max'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>
                      {pr.weight}<span style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}> {units}</span> × {pr.reps}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                      e1RM {pr.e1rm} {units}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', gap: 10, marginTop: 4 }}
        >
          <button className="btn btn-secondary" style={{ flex: 1, gap: 8 }} onClick={handleShare}>
            <Share2 size={18} /> Share
          </button>
          <button className="btn btn-primary" style={{ flex: 2, gap: 8 }} onClick={() => navigate('/')}>
            <Home size={18} /> Done
          </button>
        </motion.div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgb(var(--color-text-muted))', marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}
