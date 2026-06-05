// Shared formatting helpers.

/** Clock-style duration: H:MM:SS or MM:SS (used by the live session timer). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Compact duration: "1h 23m", "45m", "30s" (used in history lists). */
export function formatDurationShort(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${total}s`
}

export function formatDateLong(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Rounded volume with thousands separator, e.g. "12,340 kg". */
export function formatVolume(kg: number, unit: string = 'kg'): string {
  return `${Math.round(kg).toLocaleString()} ${unit}`
}
