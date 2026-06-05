// Audio + haptic feedback for the rest timer.
//
// Known iOS PWA limitations (documented for future-me):
// - navigator.vibrate is Android/Chrome only; iOS Safari silently ignores it (no-op).
// - The Web Audio API must be "unlocked" by a user gesture before it can make sound.
//   We call unlockAudio() when the user taps "complete set" (a gesture), so the later
//   end-of-rest beep can play while the app is foregrounded.
// - When the app is backgrounded or the screen is locked on iOS, timers are throttled
//   and the beep will NOT fire on time — it fires when the app returns to the foreground.
//   Rest-timer alerts are only reliable while the app is open and on screen.

type AudioContextCtor = typeof AudioContext

let ctx: AudioContext | null = null

function getCtor(): AudioContextCtor | undefined {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor }
  return window.AudioContext ?? w.webkitAudioContext
}

/** Create/resume the shared AudioContext. Must be called from a user gesture on iOS. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = getCtor()
    if (Ctor) ctx = new Ctor()
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** Two short ascending beeps to signal rest is over. */
export function playBeep(): void {
  unlockAudio()
  if (!ctx) return
  const c = ctx
  const beep = (offset: number, freq: number) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = c.currentTime + offset
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.35, t + 0.01)
    gain.gain.linearRampToValueAtTime(0, t + 0.2)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.22)
  }
  beep(0, 880)
  beep(0.28, 1175)
}

/** Vibrate (Android only — iOS Safari ignores this). */
export function vibrate(pattern: number | number[] = [120, 60, 120]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
