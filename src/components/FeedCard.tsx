import { useState } from 'react'
import { Clock, Dumbbell, Layers, Trophy, ChevronDown } from 'lucide-react'
import Avatar from './Avatar'
import { formatDurationShort, formatVolume } from '../lib/format'
import { MUSCLE_COLORS } from '../lib/exerciseMeta'
import type { MuscleGroup } from '../types'
import type { FeedItem } from '../lib/social'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props {
  item: FeedItem
  units: string
  onReact: () => void
  /** Open the author's read-only profile. */
  onOpenProfile?: (userId: string) => void
}

export default function FeedCard({ item, units, onReact, onOpenProfile }: Props) {
  const [open, setOpen] = useState(false)
  const hasDetail = item.topExercises.length > 0 || item.prs.length > 0

  return (
    <div className="card" style={{ padding: 14 }}>
      {/* Author */}
      <button
        onClick={onOpenProfile ? () => onOpenProfile(item.userId) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, width: '100%',
          background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
          cursor: onOpenProfile ? 'pointer' : 'default', color: 'inherit', font: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Avatar name={item.author.displayName} color={item.author.avatarColor} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.author.displayName}
          </div>
          <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>
            @{item.author.username} · {timeAgo(item.startedAt)}
          </div>
        </div>
        {item.prCount > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
            color: 'rgb(var(--color-accent-amber))', padding: '3px 8px', borderRadius: 100,
            background: 'rgba(245 158 11 / 0.14)',
          }}>
            <Trophy size={12} /> {item.prCount}
          </span>
        )}
      </button>

      {/* Workout name */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{item.name}</div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: item.muscleGroups.length ? 12 : 4 }}>
        <Stat icon={<Clock size={14} />} value={formatDurationShort(item.durationMs)} />
        <Stat icon={<Dumbbell size={14} />} value={formatVolume(item.volume, units)} />
        <Stat icon={<Layers size={14} />} value={`${item.setCount} sets`} />
      </div>

      {/* Muscle chips */}
      {item.muscleGroups.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
          {item.muscleGroups.map(m => {
            const color = MUSCLE_COLORS[m as MuscleGroup] ?? '#94a3b8'
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

      {/* Detail (top exercises + PRs) */}
      {open && hasDetail && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgb(var(--color-border))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {item.topExercises.length > 0 && (
            <div>
              <div style={detailLabel}>Top exercises</div>
              {item.topExercises.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <span style={{ color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                    {e.sets}×{' · '}{formatVolume(e.volume, units)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {item.prs.length > 0 && (
            <div>
              <div style={{ ...detailLabel, color: 'rgb(var(--color-accent-amber))' }}>Personal records</div>
              {item.prs.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span style={{ fontWeight: 600 }}>🏆 {p.exerciseName}</span>
                  <span style={{ color: 'rgb(var(--color-text-muted))', fontVariantNumeric: 'tabular-nums' }}>
                    {p.weight}{units} × {p.reps}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button
          onClick={onReact}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            border: item.reactedByMe ? '1px solid rgba(34 197 94 / 0.5)' : '1px solid rgb(var(--color-border))',
            background: item.reactedByMe ? 'rgba(34 197 94 / 0.14)' : 'transparent',
            color: item.reactedByMe ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text))',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          💪 {item.reactionCount > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.reactionCount}</span>}
        </button>
        {hasDetail && (
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 'auto', fontSize: 13, gap: 4, color: 'rgb(var(--color-text-muted))', padding: '6px 8px' }}
            onClick={() => setOpen(o => !o)}
          >
            {open ? 'Less' : 'Details'}
            <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
      {icon}
      <span style={{ fontWeight: 600, color: 'rgb(var(--color-text))', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

const detailLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'rgb(var(--color-text-muted))', marginBottom: 6,
}
