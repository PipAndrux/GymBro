import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export type Unit = 'kg' | 'lb'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface AppSettings {
  units: Unit
  defaultRestSeconds: number
  theme: ThemePreference
  barWeight: number
  plateWeightsKg: number[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  units: 'kg',
  defaultRestSeconds: 90,
  theme: 'dark',
  barWeight: 20,
  plateWeightsKg: [25, 20, 15, 10, 5, 2.5, 1.25],
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
    barWeight: (map.barWeight as number | undefined) ?? DEFAULT_SETTINGS.barWeight,
    plateWeightsKg: (map.plateWeightsKg as number[] | undefined) ?? DEFAULT_SETTINGS.plateWeightsKg,
  }
}
