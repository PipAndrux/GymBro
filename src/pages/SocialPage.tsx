import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Trophy, Rss, Flame, Dumbbell, User, UserPlus, Check, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { supabaseConfigured } from '../lib/supabase'
import { useTier } from '../lib/tier'
import { useSettings } from '../lib/settings'
import {
  fetchMyProfile, getFeed, getLeaderboard, createProfile, normalizeUsername, toggleReaction,
  getPendingRequests, acceptRequest, declineRequest, getFriends, backfillShareDetails,
  type SocialProfile, type FeedItem, type LeaderboardRow, type FriendRequest, type Friend,
} from '../lib/social'
import { formatVolume } from '../lib/format'
import FeedCard from '../components/FeedCard'
import FriendsSheet from '../components/FriendsSheet'
import BottomSheet from '../components/BottomSheet'
import Avatar from '../components/Avatar'

type Tab = 'feed' | 'board'
type Metric = 'volume' | 'workouts' | 'streak'

function weekStartMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d.getTime()
}

export default function SocialPage() {
  const navigate = useNavigate()
  const user = useAuth(s => s.user)
  const tier = useTier()
  const { units } = useSettings()

  const [profile, setProfile] = useState<SocialProfile | null | undefined>(undefined)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [board, setBoard] = useState<LeaderboardRow[]>([])
  const [tab, setTab] = useState<Tab>('feed')
  const [metric, setMetric] = useState<Metric>('volume')
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!supabaseConfigured || !user) { setProfile(null); return }
    setProfile(await fetchMyProfile())
  }, [user])

  const loadSocial = useCallback(async () => {
    if (!supabaseConfigured || !user) return
    setLoading(true)
    try {
      const [f, b] = await Promise.all([getFeed(), getLeaderboard(weekStartMs())])
      setFeed(f); setBoard(b)
    } finally { setLoading(false) }
  }, [user])

  const loadRequests = useCallback(async () => {
    if (!supabaseConfigured || !user) return
    setPendingRequests(await getPendingRequests())
  }, [user])

  const loadFriends = useCallback(async () => {
    if (!supabaseConfigured || !user) return
    setFriendsLoading(true)
    try { setFriends(await getFriends()) } finally { setFriendsLoading(false) }
  }, [user])

  useEffect(() => { void loadProfile() }, [loadProfile])
  useEffect(() => {
    if (profile) {
      void loadSocial(); void loadRequests(); void loadFriends()
      // Enrich already-shared workouts with set-by-set detail (one-off, idempotent)
      // so friends can copy/compare history shared before this release.
      void backfillShareDetails()
    }
  }, [profile, loadSocial, loadRequests, loadFriends])

  function openFriend(id: string) {
    setPanelOpen(false)
    navigate(`/friend/${id}`)
  }

  async function handleReact(item: FeedItem) {
    const next = !item.reactedByMe
    setFeed(prev => prev.map(f => f.uuid === item.uuid ? { ...f, reactedByMe: next, reactionCount: f.reactionCount + (next ? 1 : -1) } : f))
    try {
      await toggleReaction(item.uuid, item.reactedByMe)
    } catch {
      setFeed(prev => prev.map(f => f.uuid === item.uuid ? { ...f, reactedByMe: item.reactedByMe, reactionCount: item.reactionCount } : f))
    }
  }

  // ── Gate states ────────────────────────────────────────────────────────────
  if (!supabaseConfigured) {
    return (
      <Shell>
        <Empty icon={<Users size={40} />} title="Friends need cloud sync"
          body="Cloud sync isn’t configured for this build, so the friends feed is unavailable." />
      </Shell>
    )
  }
  if (!user) {
    return (
      <Shell>
        <Empty icon={<Users size={40} />} title="Connect with friends"
          body="Sign in to add friends, share workouts, and see their progress." />
        <button className="btn btn-primary" style={{ width: '100%', maxWidth: 280, margin: '0 auto' }} onClick={() => navigate('/settings')}>
          Sign in
        </button>
      </Shell>
    )
  }
  if (profile === undefined) {
    return <Shell><div style={{ paddingTop: 60 }} /></Shell>
  }
  if (profile === null) {
    return <Shell><ProfileSetup tier={tier} onCreated={async () => { await loadProfile() }} /></Shell>
  }

  // ── Ready ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px' }}>
        <Avatar name={profile.displayName} color={profile.avatarColor} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Friends</h1>
          <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>@{profile.username}</div>
        </div>
        {/* Friends panel icon */}
        <button
          className="icon-btn"
          onClick={() => setPanelOpen(true)}
          aria-label="friends"
          style={{ position: 'relative' }}
        >
          <User size={22} />
          {pendingRequests.length > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 0,
              minWidth: 16, height: 16, borderRadius: 8,
              background: '#ef4444', color: '#fff',
              fontSize: 10, fontWeight: 800, lineHeight: '16px', textAlign: 'center',
              padding: '0 3px',
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 16px 12px' }}>
        <TabBtn active={tab === 'feed'} onClick={() => setTab('feed')} icon={<Rss size={16} />} label="Feed" />
        <TabBtn active={tab === 'board'} onClick={() => setTab('board')} icon={<Trophy size={16} />} label="Leaderboard" />
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'feed' ? (
          feed.length === 0 ? (
            <Empty
              icon={<Rss size={36} />}
              title={loading ? 'Loading…' : 'No activity yet'}
              body="Add friends to see their workouts here. Share your friend code from Manage."
            />
          ) : (
            feed.map(item => <FeedCard key={item.uuid} item={item} units={units} onReact={() => void handleReact(item)} onOpenProfile={openFriend} />)
          )
        ) : (
          <Leaderboard rows={board} metric={metric} onMetric={setMetric} units={units} loading={loading} onOpen={openFriend} />
        )}
      </div>

      <FriendsSheet
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onBack={() => { setFriendsOpen(false); setPanelOpen(true) }}
        profile={profile}
        onChanged={() => { void loadProfile(); void loadSocial(); void loadFriends() }}
      />

      {/* Friends panel */}
      <BottomSheet
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header: title + add-friend on one row (keeps the top tight) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Friends</h2>
          <button
            className="btn btn-secondary"
            style={{ gap: 6, fontSize: 13, padding: '8px 12px' }}
            onClick={() => { setPanelOpen(false); setFriendsOpen(true) }}
          >
            <UserPlus size={16} /> Add
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={panelSectionLabel}>Pending requests ({pendingRequests.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pendingRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgb(var(--color-border))' }}>
                    <Avatar name={req.fromProfile.displayName} color={req.fromProfile.avatarColor} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{req.fromProfile.displayName}</div>
                      <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>@{req.fromProfile.username}</div>
                    </div>
                    <button
                      className="icon-btn"
                      style={{ color: '#22c55e' }}
                      aria-label="accept"
                      onClick={async () => {
                        try {
                          await acceptRequest(req.id)
                          setPendingRequests(prev => prev.filter(r => r.id !== req.id))
                          void loadProfile(); void loadSocial(); void loadFriends()
                        } catch { /* silent */ }
                      }}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ color: '#ef4444' }}
                      aria-label="decline"
                      onClick={async () => {
                        await declineRequest(req.id)
                        setPendingRequests(prev => prev.filter(r => r.id !== req.id))
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div>
            <div style={panelSectionLabel}>My friends ({friends.length})</div>
            {friendsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgb(var(--color-text-muted))', fontSize: 14 }}>Loading…</div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'rgb(var(--color-text-muted))' }}>
                <Users size={36} style={{ opacity: 0.4, marginBottom: 10 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: 'rgb(var(--color-text))', marginBottom: 6 }}>No friends yet</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>Add one with the button above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {friends.map((f: Friend) => (
                  <button
                    key={f.friendshipId}
                    onClick={() => openFriend(f.profile.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', width: '100%',
                      borderTop: '1px solid rgb(var(--color-border))', borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
                      background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <Avatar name={f.profile.displayName} color={f.profile.avatarColor} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{f.profile.displayName}</div>
                      <div style={{ fontSize: 13, color: 'rgb(var(--color-text-muted))' }}>@{f.profile.username}</div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'rgb(var(--color-text-muted))', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Leaderboard ─────────────────────────────────────────────────────────────────

function Leaderboard({ rows, metric, onMetric, units, loading, onOpen }: {
  rows: LeaderboardRow[]; metric: Metric; onMetric: (m: Metric) => void; units: string; loading: boolean
  onOpen: (id: string) => void
}) {
  const sorted = [...rows].sort((a, b) => valueFor(b, metric) - valueFor(a, metric))
  const metrics: { value: Metric; label: string; icon: React.ReactNode }[] = [
    { value: 'volume', label: 'Volume', icon: <Dumbbell size={15} /> },
    { value: 'workouts', label: 'Workouts', icon: <Rss size={15} /> },
    { value: 'streak', label: 'Days', icon: <Flame size={15} /> },
  ]
  return (
    <>
      <div style={{ display: 'flex', gap: 6 }}>
        {metrics.map(m => (
          <button key={m.value} className={`btn ${metric === m.value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '8px 0', fontSize: 13, gap: 6 }} onClick={() => onMetric(m.value)}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>This week, you and your friends.</p>
      {sorted.length === 0 ? (
        <Empty icon={<Trophy size={36} />} title={loading ? 'Loading…' : 'Nothing logged this week'}
          body="Complete a workout this week to climb the board." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
          {sorted.map((r, i) => (
            <div
              key={r.profile.id}
              className="card"
              onClick={r.isMe ? undefined : () => onOpen(r.profile.id)}
              style={{
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                border: r.isMe ? '1px solid rgba(34 197 94 / 0.5)' : '1px solid rgb(var(--color-border))',
                cursor: r.isMe ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 800, width: 22, textAlign: 'center', color: i === 0 ? 'rgb(var(--color-accent-amber))' : 'rgb(var(--color-text-muted))' }}>
                {i + 1}
              </span>
              <Avatar name={r.profile.displayName} color={r.profile.avatarColor} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.isMe ? 'You' : r.profile.displayName}</div>
                <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))' }}>@{r.profile.username}</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {metric === 'volume' ? formatVolume(r.volume, units) : metric === 'workouts' ? r.workouts : `${r.streak}d`}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function valueFor(r: LeaderboardRow, m: Metric): number {
  return m === 'volume' ? r.volume : m === 'workouts' ? r.workouts : r.streak
}

// ── Profile setup ─────────────────────────────────────────────────────────────

function ProfileSetup({ tier, onCreated }: { tier: string; onCreated: () => Promise<void> }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = normalizeUsername(username)

  async function handleCreate() {
    setBusy(true); setError('')
    try {
      await createProfile(username, displayName, tier)
      await onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create profile.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px', background: 'rgba(34 197 94 / 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={32} style={{ color: 'rgb(var(--color-accent))' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Set up your profile</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgb(var(--color-text-muted))', lineHeight: 1.5 }}>
          Pick a username so friends can find you. Workouts are friends-only by default.
        </p>
      </div>

      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Username</label>
          <input className="input" placeholder="username" value={username} autoFocus
            onChange={e => setUsername(e.target.value)} maxLength={20} />
          {preview && <div style={{ fontSize: 12, color: 'rgb(var(--color-text-muted))', marginTop: 5 }}>You’ll be <strong style={{ color: 'rgb(var(--color-accent))' }}>@{preview}</strong></div>}
        </div>
        <div>
          <label style={lbl}>Display name</label>
          <input className="input" placeholder="How your name shows to friends" value={displayName}
            onChange={e => setDisplayName(e.target.value)} maxLength={30} />
        </div>
        {error && <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy || preview.length < 3} onClick={handleCreate}>
          {busy ? 'Creating…' : 'Create profile'}
        </button>
      </div>
    </div>
  )
}

// ── Shells ────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-content">
      <h1 className="page-header">Friends</h1>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  )
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgb(var(--color-text-muted))' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'rgb(var(--color-text))', marginBottom: 6 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, maxWidth: 300, marginInline: 'auto' }}>{body}</p>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, padding: '9px 0', fontSize: 14, gap: 7 }} onClick={onClick}>
      {icon} {label}
    </button>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'rgb(var(--color-text-muted))' }
const panelSectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--color-text-muted))', marginBottom: 8 }
