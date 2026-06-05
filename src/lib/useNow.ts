import { useState, useEffect } from 'react'

/**
 * Returns a `Date.now()` value that updates on an interval while `active`.
 * Also forces a refresh when the tab returns to the foreground, so timers
 * re-sync immediately after iOS/Safari throttles background intervals.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, intervalMs])

  return now
}
