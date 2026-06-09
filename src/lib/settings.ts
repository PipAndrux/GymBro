import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export type Unit = 'kg' | 'lb'
export type ThemePreference = 'system' | 'light' | 'dark'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'red'

export interface AppSettings {
  units: Unit
  defaultRestSeconds: number
  theme: ThemePreference
  accentColor: AccentColor
  notificationsEnabled: boolean
  barWeight: number
  plateWeightsKg: number[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  units: 'kg',
  defaultRestSeconds: 90,
  theme: 'dark',
  accentColor: 'green',
  notificationsEnabled: false,
  barWeight: 20,
  plateWeightsKg: [25, 20, 15, 10, 5, 2.5, 1.25],
}

/** CSS rgb triplets for each accent choice (main + dim). */
export const ACCENT_PALETTES: Record<AccentColor, { main: string; dim: string; hex: string }> = {
  green:  { main: '34 197 94',  dim: '22 163 74',  hex: '#22c55e' },
  blue:   { main: '59 130 246', dim: '37 99 235',   hex: '#3b82f6' },
  purple: { main: '168 85 247', dim: '147 51 234',  hex: '#a855f7' },
  orange: { main: '249 115 22', dim: '234 88 12',   hex: '#f97316' },
  red:    { main: '239 68 68',  dim: '220 38 38',   hex: '#ef4444' },
}

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const row = await db.settings.get(key)
  return (row?.value as AppSettings[K]) ?? DEFAULT_SETTINGS[key]
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value })
}

export function useSettings(): AppSettings {
  const rows = useLiveQuery(() => db.settings.toArray(), [])
  if (!rows) return DEFAULT_SETTINGS
  const map: Record<string, unknown> = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    units: (map.units as Unit | undefined) ?? DEFAULT_SETTINGS.units,
    defaultRestSeconds: (map.defaultRestSeconds as number | undefined) ?? DEFAULT_SETTINGS.defaultRestSeconds,
    theme: (map.theme as ThemePreference | undefined) ?? DEFAULT_SETTINGS.theme,
    accentColor: (map.accentColor as AccentColor | undefined) ?? DEFAULT_SETTINGS.accentColor,
    notificationsEnabled: (map.notificationsEnabled as boolean | undefined) ?? DEFAULT_SETTINGS.notificationsEnabled,
    barWeight: (map.barWeight as number | undefined) ?? DEFAULT_SETTINGS.barWeight,
    plateWeightsKg: (map.plateWeightsKg as number[] | undefined) ?? DEFAULT_SETTINGS.plateWeightsKg,
  }
}
