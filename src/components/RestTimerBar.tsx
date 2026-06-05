import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, X, Check } from 'lucide-react'
import { useSession } from '../store/sessionStore'
import { useNow } from '../lib/useNow'
import { playBeep, vibrate } from '../lib/feedback'

const AUTO_DISMISS_MS = 5000

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Global rest-timer bar. Lives at the app root (not inside the session screen)
 * so it keeps running and alerting even if you switch tabs mid-workout.
 *
 * iOS note: while the app is backgrounded/locked, the interval is throttled, so
 * the beep/vibration fires when the app returns to the foreground rather than
 * exactly on time. Alerts are reliable only while the app is on screen.
 */
export default function RestTimerBar() {
  const restTimer = useSession(s => s.restTimer)
  const adjustRest = useSession(s => s.adjustRest)
  const clearRest = useSession(s => s.clearRest)
  const now = useNow(!!restTimer, 250)

  // Remember which timer (by end time) we've already alerted for, so the
  // beep/vibration fires exactly once per rest period.
  const firedRef = useRef<number | null>(null)

  // Fire the alert once when the countdown reaches zero, then auto-dismiss a few
  // seconds later. Both are derived from `now` — no extra state, no stale timers.
  useEffect(() => {
    if (!restTimer) return
    if (now >= restTimer.endAt && firedRef.current !== restTimer.endAt) {
      firedRef.current = restTimer.endAt
      playBeep()
      vibrate([120, 60, 120, 60, 220])
    }
    if (now >= restTimer.endAt + AUTO_DISMISS_MS) {
      clearRest()
    }
  }, [now, restTimer, clearRest])

  const remainingMs = restTimer ? Math.max(0, restTimer.endAt - now) : 0
  const remaining = Math.ceil(remainingMs / 1000)
  const reached = !!restTimer && now >= restTimer.endAt
  const progress = restTimer ? Math.min(1, 1 - remainingMs / (restTimer.duration * 1000)) : 0

  return (
    <AnimatePresence>
      {restTimer && (
        <motion.div
          className="rest-bar"
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          <div
            className="rest-bar-progress"
            style={{ width: `${progress * 100}%`, background: reached ? '#22c55e' : 'rgb(var(--color-accent))' }}
          />
          <div className="rest-bar-inner">
            {reached ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#22c55e' }}>
                  <Check size={20} /> Rest complete
                </div>
                <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={() => clearRest()}>
                  Dismiss
                </button>
              </>
            ) : (
              <>
                <button className="rest-ctrl" onClick={() => adjustRest(-15)} aria-label="subtract 15 seconds">
                  <Minus size={18} />
                </button>
                <div style={{ textAlign: 'center', minWidth: 76 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(remaining)}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.08em', color: 'rgb(var(--color-text-muted))' }}>REST</div>
                </div>
                <button className="rest-ctrl" onClick={() => adjustRest(15)} aria-label="add 15 seconds">
                  <Plus size={18} />
                </button>
                <button className="rest-ctrl rest-skip" onClick={() => clearRest()} aria-label="skip rest">
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
