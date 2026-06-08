import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { supabaseConfigured } from '../lib/supabase'

interface Props {
  onGuest: () => void
}

export default function LandingPage({ onGuest }: Props) {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth()
  const [emailMode, setEmailMode] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth() {
    if (!email || !password) return
    setError(''); setLoading(true)
    try {
      if (isSignUp) await signUpWithEmail(email, password)
      else await signInWithEmail(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgb(var(--color-bg))',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 24px calc(24px + var(--safe-bottom))',
      paddingTop: 'calc(24px + var(--safe-top))',
    }}>
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'rgba(34 197 94 / 0.15)',
          border: '2px solid rgba(34 197 94 / 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Dumbbell size={40} color='rgb(var(--color-accent))' />
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 900, letterSpacing: -1.5,
          color: 'rgb(var(--color-text))', margin: '0 0 8px',
        }}>GymBro</h1>
        <p style={{
          fontSize: 15, color: 'rgb(var(--color-text-muted))',
          margin: 0, lineHeight: 1.5,
        }}>
          Track workouts, food, and progress.<br />Your data, your gains.
        </p>
      </div>

      {/* Auth card */}
      <div style={{ width: '100%', maxWidth: 390 }}>
        {supabaseConfigured ? (
          !emailMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OAuthButton
                icon="G" label="Continue with Google" color="#4285f4"
                onClick={() => void signInWithGoogle()}
              />
              <OAuthButton
                icon="🍎" label="Continue with Apple" color="#1c1c1e"
                border="1px solid rgba(255,255,255,0.2)"
                onClick={() => void signInWithApple()}
              />
              <button
                className="btn btn-secondary"
                style={{ width: '100%', padding: '13px 16px', fontSize: 15, fontWeight: 700 }}
                onClick={() => setEmailMode(true)}
              >
                Continue with Email
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgb(var(--color-border))' }} />
                <span style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgb(var(--color-border))' }} />
              </div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%', padding: '13px 16px', fontSize: 15, fontWeight: 600 }}
                onClick={onGuest}
              >
                Continue as Guest
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'rgb(var(--color-text-muted))', margin: '4px 0 0' }}>
                Guest mode: data stays on this device only
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input"
                type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)}
                autoFocus
                style={{ padding: '13px 14px', fontSize: 15 }}
              />
              <input
                className="input"
                type="password" placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleEmailAuth()}
                style={{ padding: '13px 14px', fontSize: 15 }}
              />
              {error && (
                <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 500 }}>{error}</p>
              )}
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '13px 16px', fontSize: 15, fontWeight: 700 }}
                onClick={handleEmailAuth}
                disabled={loading || !email || !password}
              >
                {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => setEmailMode(false)}
                >
                  ← Back
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => setIsSignUp(v => !v)}
                >
                  {isSignUp ? 'Have an account?' : 'Create account'}
                </button>
              </div>
            </div>
          )
        ) : (
          /* Supabase not configured — guest only */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px 16px', fontSize: 16, fontWeight: 700 }}
              onClick={onGuest}
            >
              Get Started
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgb(var(--color-text-muted))', margin: 0 }}>
              All data stays on this device
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function OAuthButton({
  icon, label, color, border, onClick,
}: {
  icon: string; label: string; color: string; border?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '13px 16px', borderRadius: 'var(--radius-md)',
        background: color,
        border: border ?? '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'opacity 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  )
}
