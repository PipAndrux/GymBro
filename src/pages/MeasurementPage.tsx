import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../db'
import type { MeasurementEntry } from '../types'
import BottomSheet from '../components/BottomSheet'
import { CHART_GREEN as GREEN, CHART_MUTED as MUTED, CHART_GRID, tooltipStyle } from '../lib/chartTheme'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MeasurementPage() {
  const navigate = useNavigate()
  const { uuid } = useParams<{ uuid: string }>()
  const [logOpen, setLogOpen] = useState(false)

  const data = useLiveQuery(async () => {
    if (!uuid) return null
    const measurement = await db.measurements.get(uuid)
    if (!measurement || measurement.deletedAt) return null
    const entries = await db.measurementEntries
      .where('measurementUuid').equals(uuid)
      .filter(e => e.deletedAt === null)
      .toArray()
    entries.sort((a, b) => b.date.localeCompare(a.date))
    return { measurement, entries }
  }, [uuid])

  const measurement = data?.measurement
  const entries = data?.entries ?? []
  const latest = entries[0]
  const chartData = [...entries].reverse().map(e => ({ label: shortDate(e.date), value: e.value }))

  async function handleDelete(entry: MeasurementEntry) {
    const now = Date.now()
    await db.measurementEntries.update(entry.uuid, { deletedAt: now, updatedAt: now })
  }

  if (!measurement && data !== undefined) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <PageHeader title="Measurement" onBack={() => navigate(-1)} />
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>Measurement not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <PageHeader
        title={measurement?.label ?? ''}
        onBack={() => navigate(-1)}
        action={
          <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 100 }} onClick={() => setLogOpen(true)}>
            <Plus size={16} /> Log
          </button>
        }
      />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Current value headline */}
        {latest && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 6 }}>
              Current
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {latest.value}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'rgb(var(--color-text-muted))' }}>
                {measurement?.unit}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 6 }}>
              {fmtDate(latest.date)}
            </div>
          </div>
        )}

        {/* Trend chart */}
        {chartData.length >= 2 && (
          <div>
            <div className="section-title" style={{ padding: 0, marginBottom: 8 }}>
              <TrendingUp size={13} style={{ display: 'inline', marginRight: 5 }} />
              Trend
            </div>
            <div className="card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={40} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: MUTED, fontSize: 11, marginBottom: 2 }}
                      formatter={(value) => [`${Number(value)} ${measurement?.unit ?? ''}`, measurement?.label ?? '']}
                    />
                    <Line type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2.5}
                      dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Entry history */}
        <div>
          <div className="section-title" style={{ padding: 0, marginBottom: 8 }}>History</div>
          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <TrendingUp size={36} strokeWidth={1.5} />
              <p>No entries yet. Tap Log to record your first measurement.</p>
              <button className="btn btn-primary" onClick={() => setLogOpen(true)}>
                <Plus size={16} /> Log entry
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {entries.map((entry, i) => (
                <div key={entry.uuid} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderTop: i > 0 ? '1px solid rgb(var(--color-border))' : 'none',
                }}>
                  <span style={{ fontSize: 14, color: 'rgb(var(--color-text-muted))' }}>
                    {fmtDate(entry.date)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {entry.value}
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--color-text-muted))', marginLeft: 3 }}>
                        {measurement?.unit}
                      </span>
                    </span>
                    <button
                      className="icon-btn"
                      style={{ width: 28, height: 28, color: '#ef4444' }}
                      onClick={() => void handleDelete(entry)}
                      aria-label="delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {measurement && (
        <LogEntrySheet
          open={logOpen}
          onClose={() => setLogOpen(false)}
          measurementUuid={uuid!}
          unit={measurement.unit}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'rgb(var(--color-bg))', borderBottom: '1px solid rgb(var(--color-border))' }}>
      <div style={{ paddingTop: 'var(--safe-top)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
        <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={onBack} aria-label="back">
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
        {action}
      </div>
    </div>
  )
}

interface LogEntrySheetProps {
  open: boolean
  onClose: () => void
  measurementUuid: string
  unit: string
}

function LogEntrySheet({ open, onClose, measurementUuid, unit }: LogEntrySheetProps) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayStr)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    setSaving(true)
    try {
      const now = Date.now()
      await db.measurementEntries.add({
        uuid: crypto.randomUUID(),
        measurementUuid,
        value: num,
        date,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      setValue('')
      setDate(todayStr())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Log Entry">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Value ({unit})</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder={`Enter ${unit}`}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
            style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}
          />
        </div>
        <div>
          <label style={lbl}>Date</label>
          <input
            className="input"
            type="date"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving || !value || isNaN(parseFloat(value)) || parseFloat(value) <= 0}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: 'rgb(var(--color-text-muted))',
}
