import { useEffect, useState } from 'react'
import { Copy, Check, Trash2, Share2, UserPlus } from 'lucide-react'
import BottomSheet from './BottomSheet'
import Avatar from './Avatar'
import {
  getFriends, addFriendByCode, addFriendById, removeFriend, searchProfiles, setWorkoutPrivacy,
  type SocialProfile, type Friend, type FriendProfile, type WorkoutPrivacy,
} from '../lib/social'

interface Props {
  open: boolean
  onClose: () => void
  profile: SocialProfile
  onChanged: () => void
}

const PRIVACY_OPTS: { value: WorkoutPrivacy; label: string; desc: string }[] = [
  { value: 'public', label: 'Public', desc: 'Any GymBro user can see your finished workouts.' },
  { value: 'friends', label: 'Friends', desc: 'Only your friends can see your finished workouts.' },
  { value: 'private', label: 'Private', desc: 'No one — nothing appears in anyone’s feed.' },
]

export default function FriendsSheet({ open, onClose, profile, onChanged }: Props) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [code, setCode] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendProfile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [privacy, setPrivacy] = useState<WorkoutPrivacy>(profile.workoutPrivacy)

  const friendIds = new Set(friends.map(f => f.profile.id))

  async function reloadFriends() {
    setFriends(await getFriends())
  }

  useEffect(() => {
    if (open) { void reloadFriends(); setPrivacy(profile.workoutPrivacy); setError(''); setNotice('') }
  }, [open, profile.workoutPrivacy])

  // Live username search.
  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) { setResults([]); return }
    let cancelled = false
    void (async () => {
      const r = await searchProfiles(query)
      if (!cancelled) setResults(r)
    })()
    return () => { cancelled = true }
  }, [query, open])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profile.shareCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  async function handleShareCode() {
    const text = `Add me on GymBro! My friend code is ${profile.shareCode}`
    try {
      if (navigator.share) await navigator.share({ title: 'GymBro friend code', text })
      else await handleCopy()
    } catch { /* cancelled */ }
  }

  async function handleAddByCode() {
    if (!code.trim()) return
    setBusy(true); setError(''); setNotice('')
    try {
      const f = await addFriendByCode(code)
      setCode('')
      await reloadFriends()
      onChanged()
      setNotice(`Added ${f.displayName}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add friend.')
    } finally { setBusy(false) }
  }

  async function handleAddById(p: FriendProfile) {
    setBusy(true); setError(''); setNotice('')
    try {
      await addFriendById(p.id)
      await reloadFriends()
      onChanged()
      setNotice(`Added ${p.displayName}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add friend.')
    } finally { setBusy(false) }
  }

  async function handleRemove(friendshipId: string) {
    await removeFriend(friendshipId)
    await reloadFriends()
    onChanged()
  }

  async function handlePrivacy(p: WorkoutPrivacy) {
    setPrivacy(p)
    await setWorkoutPrivacy(p)
    onChanged()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Friends">
      {/* Your code */}
      <div style={{ ...box, marginBottom: 18 }}>
        <div style={sectionLabel}>Your friend code</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, fontVariantNumeric: 'tabular-nums', flex: 1 }}>
            {profile.shareCode}
          </span>
          <button className="icon-btn" onClick={handleCopy} aria-label="copy code">
            {copied ? <Check size={18} style={{ color: 'rgb(var(--color-accent))' }} /> : <Copy size={18} />}
          </button>
          <button className="icon-btn" onClick={handleShareCode} aria-label="share code">
            <Share2 size={18} />
          </button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>
          Share this with friends so they can add you.
        </p>
      </div>

      {/* Add a friend */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionLabel}>Add a friend by code</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input" style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 1 }}
            placeholder="e.g. K7QM2X" value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleAddByCode()}
          />
          <button className="btn btn-primary" disabled={busy || !code.trim()} onClick={handleAddByCode}>
            <UserPlus size={16} /> Add
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            className="input"
            placeholder="…or search by username"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {results.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                  <Avatar name={p.displayName} color={p.avatarColor} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.displayName}</div>
                    <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>@{p.username}</div>
                  </div>
                  {friendIds.has(p.id) ? (
                    <span style={{ fontSize: 12, color: 'rgb(var(--color-accent))', fontWeight: 700 }}>Friends</span>
                  ) : (
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} disabled={busy} onClick={() => handleAddById(p)}>
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#ef4444' }}>{error}</p>}
        {notice && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgb(var(--color-accent))', fontWeight: 600 }}>{notice}</p>}
      </div>

      {/* Privacy */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionLabel}>Who can see your workouts</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {PRIVACY_OPTS.map(o => (
            <button
              key={o.value}
              className={`btn ${privacy === o.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '9px 0', fontSize: 13 }}
              onClick={() => void handlePrivacy(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          {PRIVACY_OPTS.find(o => o.value === privacy)?.desc}
        </p>
      </div>

      {/* Friends list */}
      <div>
        <div style={sectionLabel}>Friends ({friends.length})</div>
        {friends.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>
            No friends yet. Share your code above to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {friends.map(f => (
              <div key={f.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid rgb(var(--color-border))' }}>
                <Avatar name={f.profile.displayName} color={f.profile.avatarColor} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.profile.displayName}</div>
                  <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>@{f.profile.username}</div>
                </div>
                <button className="icon-btn" onClick={() => void handleRemove(f.friendshipId)} aria-label="remove friend">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

const box: React.CSSProperties = {
  background: 'rgb(var(--color-surface-2))', borderRadius: 'var(--radius-md)', padding: 14,
}
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'rgb(var(--color-text-muted))', marginBottom: 8,
}
