import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

interface SyncStoreState {
  /** True while a user is signed in (sync is active). */
  enabled: boolean
  status: SyncStatus
  lastSyncedAt: number | null
}

export const useSyncStore = create<SyncStoreState>(() => ({
  enabled: false,
  status: 'idle',
  lastSyncedAt: null,
}))
