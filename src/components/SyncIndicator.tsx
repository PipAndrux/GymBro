import { RefreshCw, Check, CloudOff, AlertCircle } from 'lucide-react'
import { useSyncStore } from '../store/syncStore'

// Small, informational sync-status pill. Only renders when signed in.
export default function SyncIndicator() {
  const { enabled, status, lastSyncedAt } = useSyncStore()
  if (!enabled) return null

  const config = {
    syncing: { Icon: RefreshCw, color: 'rgb(var(--color-accent))', label: 'Syncing…', spin: true },
    idle: { Icon: Check, color: 'rgb(var(--color-accent))', label: lastSyncedAt ? 'Synced' : 'Up to date', spin: false },
    offline: { Icon: CloudOff, color: 'rgb(var(--color-text-muted))', label: 'Offline', spin: false },
    error: { Icon: AlertCircle, color: '#f59e0b', label: 'Sync error', spin: false },
  }[status]

  const { Icon, color, label, spin } = config

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600, color,
    }}>
      <Icon size={13} className={spin ? 'spin' : undefined} />
      <span>{label}</span>
    </div>
  )
}
