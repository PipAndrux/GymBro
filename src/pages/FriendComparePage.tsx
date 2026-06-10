// Phase 3 — Task 3: compare your lifts vs a friend's on the same exercise.
// Only exercises BOTH users have logged appear in the picker. Your data comes from
// the local DB; the friend's comes from their shared workouts (RLS-gated). The
// overlay chart plots top working weight over time for the selected exercise.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  getFriendProfileData, normalizeExerciseName,
  type FriendProfileData,
} from '../lib/social'
import { getExercisesWithData, getExerciseE1RMSeries } from '../lib/prs'
import { useSettings } from '../lib/settings'
import { CHART_GREEN, CHART_MUTED as MUTED, CHART_GRID, tooltipStyle } from '../lib/chartTheme'

interface NamedSeries { name: string; points: { date: number; weight: number }[] }

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function FriendComparePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { units } = useSettings()

  const [friendData, setFriendData] = useState<FriendProfileData | null | undefined>(undefined)
  const [myExercises, setMyExercises] = useState<{ key: string; name: string; uuid: string }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [mySeriesCache, setMySeriesCache] = useState<Record<string, { date: number; weight: number }[]>>({})

  // Load friend's shared workouts + my logged exercises once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [fd, mine] = await Promise.all([
        id ? getFriendProfileData(id) : Promise.resolve(null),
        getExercisesWithData(),
      ])
      if (cancelled) return
      setFriendData(fd)
      setMyExercises(mine.map(e => ({ key: normalizeExerciseName(e.name), name: e.name, uuid: e.exerciseUuid })))
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [id])

  // Friend's per-exercise weight series (max weight per workout), keyed by name.
  const friendSeries = useMemo(() => {
    const map = new Map<string, NamedSeries>()
    if (!friendData) return map
    for (const w of friendData.workouts) {
      for (const ex of w.exercises) {
        if (ex.sets.length === 0) continue
        const key = normalizeExerciseName(ex.name)
        if (!key) continue
        const maxWeight = ex.sets.reduce((m, s) => Math.max(m, s.weight || 0), 0)
        if (maxWeight <= 0) continue
        const entry = map.get(key) ?? { name: ex.name, points: [] }
        entry.points.push({ date: w.startedAt, weight: maxWeight })
        map.set(key, entry)
      }
    }
    return map
  }, [friendData])

  const myMap = useMemo(() => {
    const m = new Map<string, { name: string; uuid: string }>()
    for (const e of myExercises) m.set(e.key, { name: e.name, uuid: e.uuid })
    return m
  }, [myExercises])

  // Exercises both have logged.
  const common = useMemo(() => {
    const out: { key: string; name: string }[] = []
    for (const [key, mine] of myMap) {
      if (friendSeries.has(key)) out.push({ key, name: mine.name })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [myMap, friendSeries])

  // Default selection once data is in.
  useEffect(() => {
    if (selected === null && common.length > 0) setSelected(common[0].key)
  }, [common, selected])

  // Lazily fetch my weight series for the selected exercise.
  useEffect(() => {
    if (!selected || mySeriesCache[selected]) return
    const mine = myMap.get(selected)
    if (!mine) return
    let cancelled = false
    ;(async () => {
      const series = await getExerciseE1RMSeries(mine.uuid)
      if (cancelled) return
      setMySeriesCache(prev => ({ ...prev, [selected]: series.map(p => ({ date: p.date, weight: p.bestWeight })) }))
    })()
    return () => { cancelled = true }
  }, [selected, myMap, mySeriesCache])

  const friendName = friendData?.profile.displayName ?? 'Friend'
  const friendColorRaw = friendData?.profile.avatarColor ?? '#3b82f6'
  const friendColor = friendColorRaw.toLowerCase() === CHART_GREEN.toLowerCase() ? '#3b82f6' : friendColorRaw

  const chartData = useMemo(() => {
    if (!selected) return []
    const mine = mySeriesCache[selected] ?? []
    const theirs = friendSeries.get(selected)?.points ?? []
    const byDay = new Map<string, { ts: number; me?: number; friend?: number }>()
    const add = (pts: { date: number; weight: number }[], field: 'me' | 'friend') => {
      for (const p of pts) {
        const k = dayKey(p.date)
        const cur = byDay.get(k) ?? { ts: new Date(k + 'T12:00:00').getTime() }
        cur[field] = Math.max(cur[field] ?? 0, p.weight)
        byDay.set(k, cur)
      }
    }
    add(mine, 'me'); add(theirs, 'friend')
    return [...byDay.values()].sort((a, b) => a.ts - b.ts).map(v => ({ label: shortDate(v.ts), me: v.me, friend: v.friend }))
  }, [selected, mySeriesCache, friendSeries])

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate(-1)} aria-label="back">
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700 }}>Compare</h1>
        </div>
      </div>

      {!loaded ? (
        <div className="empty-state" style={{ paddingTop: 60 }}><p>Loading…</p></div>
      ) : common.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <BarChart3 size={36} strokeWidth={1.5} />
          <p>No exercises in common yet. Once you and {friendName} have both logged the same exercise, it'll show up here.</p>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
            You vs {friendName} — top weight over time.
          </p>

          {/* Exercise picker */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {common.map(ex => (
              <button
                key={ex.key}
                className={`btn ${selected === ex.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '7px 12px', fontSize: 13 }}
                onClick={() => setSelected(ex.key)}
              >
                {ex.name}
              </button>
            ))}
          </div>

          {/* Overlay chart */}
          <div className="card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={36} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: MUTED, fontSize: 11, marginBottom: 2 }}
                    formatter={(value, name) => [`${Number(value)} ${units}`, name === 'me' ? 'You' : friendName]}
                  />
                  <Legend formatter={(value) => (value === 'me' ? 'You' : friendName)} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="me" stroke={CHART_GREEN} strokeWidth={2.5} dot={{ r: 3, fill: CHART_GREEN, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey="friend" stroke={friendColor} strokeWidth={2.5} dot={{ r: 3, fill: friendColor, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
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
