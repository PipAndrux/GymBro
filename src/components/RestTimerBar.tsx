import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useSession } from '../store/sessionStore'
import { useNow } from '../lib/useNow'
import { playBeep, vibrate } from '../lib/feedback'

const AUTO_DISMISS_MS = 5000
const RADIUS = 66
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Global rest-timer overlay. Lives at the app root (not inside the session screen)
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
  const now = useNow(!!restTimer, 100)
  const firedRef = useRef<number | null>(null)
  const [showGo, setShowGo] = useState(false)

  useEffect(() => {
    if (!restTimer) return

    let cleanup: (() => void) | undefined

    if (now >= restTimer.endAt && firedRef.current !== restTimer.endAt) {
      firedRef.current = restTimer.endAt
      playBeep()
      vibrate([120, 60, 120, 60, 220])
      setShowGo(true)
      const t = setTimeout(() => setShowGo(false), 2000)
      cleanup = () => clearTimeout(t)
    } else if (now >= restTimer.endAt + AUTO_DISMISS_MS) {
      clearRest()
    }

    return cleanup
  }, [now, restTimer, clearRest])

  const remainingMs = restTimer ? Math.max(0, restTimer.endAt - now) : 0
  const remaining = Math.ceil(remainingMs / 1000)
  const reached = !!restTimer && now >= restTimer.endAt
  const progress = restTimer ? Math.max(0, 1 - remainingMs / (restTimer.duration * 1000)) : 0
  const strokeOffset = CIRCUMFERENCE * (1 - progress)
  const ringColor = reached ? '#22c55e' : '#f59e0b'

  return (
    <>
      {/* "GO!" full-screen flash when rest ends */}
      <AnimatePresence>
        {showGo && (
          <motion.div
            key="go-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(34, 197, 94, 0.1)',
              pointerEvents: 'none',
            }}
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 260 }}
              style={{
                fontSize: 100, fontWeight: 900, color: '#22c55e',
                letterSpacing: -4, lineHeight: 1,
                textShadow: '0 0 60px rgba(34, 197, 94, 0.6), 0 4px 24px rgba(34, 197, 94, 0.4)',
              }}
            >
              GO!
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Large circular rest timer card */}
      <AnimatePresence>
        {restTimer && (
          <motion.div
            className="rest-timer-card"
            initial={{ y: 320, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="rest-timer-inner">
              {/* Circular countdown ring */}
              <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0 }}>
                <svg width="168" height="168" style={{ transform: 'rotate(-90deg)' }}>
                  {/* track */}
                  <circle cx="84" cy="84" r={RADIUS} fill="none"
                    stroke="rgb(var(--color-surface-2))" strokeWidth="10" />
                  {/* progress arc */}
                  <circle cx="84" cy="84" r={RADIUS} fill="none"
                    stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s ease' }}
                  />
                </svg>

                {/* Number / label inside the ring */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                  {reached ? (
                    <span style={{
                      fontSize: 18, fontWeight: 900, color: '#22c55e',
                      letterSpacing: -0.5, textAlign: 'center', lineHeight: 1.1,
                    }}>
                      REST<br />OVER
                    </span>
                  ) : (
                    <>
                      <span style={{
                        fontSize: 46, fontWeight: 900, lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums', color: '#f59e0b',
                      }}>
                        {fmt(remaining)}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                        color: 'rgb(var(--color-text-muted))', textTransform: 'uppercase', marginTop: 3,
                      }}>
                        REST
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Adjust + skip/dismiss controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
                <button className="rest-ctrl-btn" onClick={() => adjustRest(-15)} aria-label="subtract 15 seconds">
                  <Minus size={18} />
                  <span>−15s</span>
                </button>

                {reached ? (
                  <button
                    className="btn btn-primary"
                    style={{ borderRadius: 100, padding: '11px 28px' }}
                    onClick={() => clearRest()}
                  >
                    Dismiss
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ borderRadius: 100, padding: '11px 24px', fontSize: 14 }}
                    onClick={() => clearRest()}
                  >
                    Skip
                  </button>
                )}

                <button className="rest-ctrl-btn" onClick={() => adjustRest(15)} aria-label="add 15 seconds">
                  <Plus size={18} />
                  <span>+15s</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
