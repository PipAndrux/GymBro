import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Columns2, Clock } from 'lucide-react'
import { db } from '../db'
import type { ProgressPhoto } from '../types'

async function resizeToJpeg(file: File, maxDim = 1000): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
        else { width = Math.round(width * maxDim / height); height = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

export default function ProgressPhotosPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'timeline' | 'compare'>('timeline')
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const photos = useLiveQuery(() =>
    db.progressPhotos.filter(p => p.deletedAt === null).sortBy('date')
      .then(arr => [...arr].reverse()),
    []
  ) ?? []

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const dataUrl = await resizeToJpeg(file)
    const now = Date.now()
    const today = new Date()
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const photo: ProgressPhoto = {
      uuid: crypto.randomUUID(), date, dataUrl,
      createdAt: now, updatedAt: now, deletedAt: null,
    }
    await db.progressPhotos.add(photo)
  }

  async function handleDelete(uuid: string) {
    await db.progressPhotos.update(uuid, { deletedAt: Date.now(), updatedAt: Date.now() })
    setDeleting(null)
  }

  const photoByDate = new Map(photos.map(p => [p.date, p]))
  const dateOptions = photos.map(p => p.date)

  const imgA = compareA ? photoByDate.get(compareA) : null
  const imgB = compareB ? photoByDate.get(compareB) : null

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ paddingTop: 'var(--safe-top)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
          <button className="btn btn-ghost" style={{ padding: '8px 4px', marginLeft: -4 }} onClick={() => navigate('/progress')}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 22, fontWeight: 700 }}>Progress Photos</h1>
          <button className="btn btn-primary" style={{ padding: '8px 14px', gap: 6, fontSize: 14 }} onClick={() => fileRef.current?.click()}>
            <Plus size={16} /> Add
          </button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 16px 10px', gap: 8 }}>
          <TabBtn active={tab === 'timeline'} onClick={() => setTab('timeline')}><Clock size={14} /> Timeline</TabBtn>
          <TabBtn active={tab === 'compare'}  onClick={() => setTab('compare')}><Columns2 size={14} /> Compare</TabBtn>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'timeline' && (
          photos.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <Plus size={36} strokeWidth={1.5} />
                <p>No photos yet. Tap <strong>Add</strong> to take your first progress photo.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {photos.map(photo => (
                <div key={photo.uuid} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img
                    src={photo.dataUrl}
                    alt={photo.date}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{formatDate(photo.date)}</div>
                    {photo.note && (
                      <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))', marginTop: 2 }}>{photo.note}</div>
                    )}
                  </div>
                  {deleting === photo.uuid ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setDeleting(null)}>Cancel</button>
                      <button className="btn" style={{ padding: '6px 10px', fontSize: 13, background: '#ef4444', color: '#fff', borderRadius: 'var(--radius-md)' }} onClick={() => void handleDelete(photo.uuid)}>Delete</button>
                    </div>
                  ) : (
                    <button className="icon-btn" style={{ color: 'rgb(var(--color-text-muted))' }} onClick={() => setDeleting(photo.uuid)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'compare' && (
          photos.length < 2 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <Columns2 size={36} strokeWidth={1.5} />
                <p>Add at least 2 photos to use the compare view.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Before */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    className="input"
                    value={compareA}
                    onChange={e => setCompareA(e.target.value)}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">Before…</option>
                    {dateOptions.map(d => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                  {imgA ? (
                    <img src={imgA.dataUrl} alt="before" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 }} />
                  ) : (
                    <div style={{ aspectRatio: '1', background: 'rgb(var(--color-surface))', borderRadius: 10, border: '1px dashed rgb(var(--color-border))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>Select date</span>
                    </div>
                  )}
                </div>
                {/* After */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    className="input"
                    value={compareB}
                    onChange={e => setCompareB(e.target.value)}
                    style={{ fontSize: 13 }}
                  >
                    <option value="">After…</option>
                    {dateOptions.map(d => (
                      <option key={d} value={d}>{formatDate(d)}</option>
                    ))}
                  </select>
                  {imgB ? (
                    <img src={imgB.dataUrl} alt="after" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 }} />
                  ) : (
                    <div style={{ aspectRatio: '1', background: 'rgb(var(--color-surface))', borderRadius: 10, border: '1px dashed rgb(var(--color-border))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>Select date</span>
                    </div>
                  )}
                </div>
              </div>
              {compareA && compareB && compareA === compareB && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
                  Select two different dates to compare.
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        background: active ? 'rgba(34 197 94 / 0.15)' : 'rgb(var(--color-surface))',
        color: active ? 'rgb(var(--color-accent))' : 'rgb(var(--color-text-muted))',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const headerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 20,
  backgroundColor: 'rgb(var(--color-bg))',
  borderBottom: '1px solid rgb(var(--color-border))',
}
