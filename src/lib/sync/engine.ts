import { supabase } from '../supabase'
import { db } from '../../db'
import type { SyncState } from '../../types'
import { useSyncStore } from '../../store/syncStore'
import { SYNC_TABLES, toRemote, fromRemote, type SyncTableConfig, type SyncRow } from './tables'

// ── Module state ────────────────────────────────────────────────────────────────
let currentUserId: string | null = null
let hooksInstalled = false
let listenersInstalled = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let inFlight: Promise<void> | null = null
let runAgain = false // a sync was requested while one was already running

const PAGE = 500       // Supabase pull page size
const CHUNK = 500      // push upsert batch size
const DEBOUNCE_MS = 1500

// ── Public API ───────────────────────────────────────────────────────────────────

/** Install Dexie change hooks + online/offline listeners. Idempotent. */
export function initSyncEngine(): void {
  installLocalChangeHooks()
  installNetworkListeners()
}

/** Called by the auth store whenever the signed-in user changes (or signs out). */
export function setSyncUser(userId: string | null): void {
  currentUserId = userId
  if (!userId || !supabase) {
    useSyncStore.setState({ enabled: false, status: 'idle' })
    return
  }
  useSyncStore.setState({ enabled: true })
  initSyncEngine()
  scheduleSync(0) // full sync immediately on sign-in / session restore
}

/** Debounced trigger — coalesces bursts of local writes into one sync. */
export function scheduleSync(delay: number = DEBOUNCE_MS): void {
  if (!currentUserId || !supabase) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debounceTimer = null; void runSync() }, delay)
}

// ── Change capture (zero edits to existing write paths) ──────────────────────────

function installLocalChangeHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true
  const onChange = () => { if (currentUserId) scheduleSync() }
  for (const cfg of SYNC_TABLES) {
    const table = cfg.table()
    table.hook('creating', () => { onChange() })
    table.hook('updating', () => { onChange() })
    table.hook('deleting', () => { onChange() })
  }
}

function installNetworkListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') return
  listenersInstalled = true
  window.addEventListener('online', () => scheduleSync(0))
  window.addEventListener('offline', () => {
    if (currentUserId) useSyncStore.setState({ status: 'offline' })
  })
}

// ── Core sync loop ───────────────────────────────────────────────────────────────

async function runSync(): Promise<void> {
  if (inFlight) { runAgain = true; return }
  const userId = currentUserId
  if (!userId || !supabase) return

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useSyncStore.setState({ status: 'offline' })
    return
  }

  useSyncStore.setState({ status: 'syncing' })
  inFlight = (async () => {
    try {
      const state = (await db.syncState.get(userId)) ?? { id: userId, lastPushedAt: 0, lastPulledServerAt: null }
      const syncStartNow = Date.now()

      const pushedMax = await pushAll(userId, state.lastPushedAt)
      const { cursor, pulledMax } = await pullAll(userId, state.lastPulledServerAt)

      // Advance the push watermark to cover (a) what we just pushed and (b) what we
      // just pulled — pulled rows are already on the server, so they must never be
      // re-pushed. Clamp pulled to syncStartNow so a future-clocked peer can't push
      // our watermark past genuine local edits (which would drop them from sync).
      let lastPushedAt = Math.max(state.lastPushedAt, pushedMax)
      if (pulledMax > -Infinity) lastPushedAt = Math.max(lastPushedAt, Math.min(pulledMax, syncStartNow))

      const next: SyncState = { id: userId, lastPushedAt, lastPulledServerAt: cursor }
      await db.syncState.put(next)

      useSyncStore.setState({ status: 'idle', lastSyncedAt: Date.now() })
    } catch (err) {
      console.error('[sync] failed', err)
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      useSyncStore.setState({ status: offline ? 'offline' : 'error' })
    }
  })()

  try { await inFlight } finally { inFlight = null }

  if (runAgain) { runAgain = false; void runSync() }
}

// ── Push ─────────────────────────────────────────────────────────────────────────

/** Upserts all local rows newer than the watermark. Returns the max updatedAt pushed. */
async function pushAll(userId: string, lastPushedAt: number): Promise<number> {
  let maxPushed = -Infinity
  for (const cfg of SYNC_TABLES) {
    let rows = await cfg.table().where('updatedAt').above(lastPushedAt).toArray()
    if (cfg.customOnly) rows = rows.filter(r => r.isCustom === true)
    if (rows.length === 0) continue

    const payload = rows.map(r => toRemote(cfg, r, userId))
    for (let i = 0; i < payload.length; i += CHUNK) {
      const { error } = await supabase!.from(cfg.name).upsert(payload.slice(i, i + CHUNK), { onConflict: 'uuid' })
      if (error) throw error
    }
    for (const r of rows) if (r.updatedAt > maxPushed) maxPushed = r.updatedAt
  }
  return maxPushed
}

// ── Pull ─────────────────────────────────────────────────────────────────────────

/** Pulls all remote rows newer than the server cursor, merging LWW into Dexie.
 *  Returns the advanced server cursor and the max updatedAt actually written. */
async function pullAll(userId: string, cursor: string | null): Promise<{ cursor: string | null; pulledMax: number }> {
  let newCursor = cursor
  let newCursorMs = cursor ? Date.parse(cursor) : -Infinity
  let pulledMax = -Infinity

  for (const cfg of SYNC_TABLES) {
    let from = 0
    for (;;) {
      let q = supabase!
        .from(cfg.name)
        .select('*')
        .eq('supabaseUserId', userId)
        .order('server_updated_at', { ascending: true })
        .order('uuid', { ascending: true })
        .range(from, from + PAGE - 1)
      if (cursor) q = q.gt('server_updated_at', cursor)

      const { data, error } = await q
      if (error) throw error
      const rows = (data ?? []) as Record<string, unknown>[]
      if (rows.length === 0) break

      for (const row of rows) {
        const written = await mergeRow(cfg, row)
        if (written !== null && written > pulledMax) pulledMax = written

        const s = row.server_updated_at as string | undefined
        if (s) {
          const ms = Date.parse(s)
          if (ms > newCursorMs) { newCursorMs = ms; newCursor = s }
        }
      }
      if (rows.length < PAGE) break
      from += PAGE
    }
  }
  return { cursor: newCursor, pulledMax }
}

/** LWW merge of one remote row. Returns the written updatedAt, or null if skipped. */
async function mergeRow(cfg: SyncTableConfig, row: Record<string, unknown>): Promise<number | null> {
  const rec = fromRemote(cfg, row)
  const local = (await cfg.table().get(rec.uuid)) as SyncRow | undefined
  // Strict-newer: skip equal/older. Skipping our own echoed rows means no local
  // write fires, so the change hooks don't schedule a redundant follow-up sync.
  if (local && rec.updatedAt <= local.updatedAt) return null
  await cfg.table().put(rec)
  return rec.updatedAt
}
