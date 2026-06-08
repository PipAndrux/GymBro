import type { Table } from 'dexie'
import { db } from '../../db'

// A syncable record: every synced table carries at least these fields.
export interface SyncRow {
  uuid: string
  updatedAt: number
  deletedAt: number | null
  isCustom?: boolean
  [key: string]: unknown
}

export interface SyncTableConfig {
  /** Dexie table name === Supabase table name (created quoted, camelCase). */
  name: string
  /** Accessor for the underlying Dexie table. */
  table: () => Table<SyncRow, string>
  /** Every column that travels to/from Supabase (excludes supabaseUserId/server_updated_at). */
  columns: string[]
  /** For exercises/foods: only push user-created rows; seed data re-seeds per device. */
  customOnly?: boolean
}

// Cast helper — the concrete Dexie tables are typed per-entity; sync treats them uniformly.
const t = (table: Table<unknown, string>) => table as unknown as Table<SyncRow, string>

// NOTE: the `settings` table is intentionally NOT synced. It has no updatedAt/
// deletedAt and holds the ephemeral active-session order; replicating it across
// devices would reference workouts that may not exist there.
export const SYNC_TABLES: SyncTableConfig[] = [
  {
    name: 'exercises',
    table: () => t(db.exercises),
    customOnly: true,
    columns: ['uuid', 'name', 'primaryMuscle', 'secondaryMuscles', 'equipment', 'category', 'isCustom', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'routines',
    table: () => t(db.routines),
    columns: ['uuid', 'name', 'exerciseOrder', 'notes', 'createdAt', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'workouts',
    table: () => t(db.workouts),
    columns: ['uuid', 'name', 'type', 'routineUuid', 'startedAt', 'endedAt', 'status', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'sets',
    table: () => t(db.sets),
    columns: ['uuid', 'workoutUuid', 'exerciseUuid', 'setNumber', 'weight', 'reps', 'rpe', 'restSeconds', 'completedAt', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'foods',
    table: () => t(db.foods),
    customOnly: true,
    columns: ['uuid', 'name', 'brand', 'caloriesPer100g', 'protein', 'carbs', 'fat', 'isCustom', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'foodEntries',
    table: () => t(db.foodEntries),
    columns: ['uuid', 'date', 'foodUuid', 'mealType', 'grams', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'dailyGoals',
    table: () => t(db.dailyGoals),
    columns: ['uuid', 'date', 'calorieGoal', 'proteinGoal', 'carbGoal', 'fatGoal', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'measurements',
    table: () => t(db.measurements),
    columns: ['uuid', 'type', 'label', 'unit', 'isCustom', 'sortOrder', 'updatedAt', 'deletedAt'],
  },
  {
    name: 'measurementEntries',
    table: () => t(db.measurementEntries),
    columns: ['uuid', 'measurementUuid', 'value', 'date', 'createdAt', 'updatedAt', 'deletedAt'],
  },
]

/** Local Dexie record → Supabase row. undefined → null so the full row state replicates. */
export function toRemote(cfg: SyncTableConfig, rec: SyncRow, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { supabaseUserId: userId }
  for (const col of cfg.columns) {
    const v = rec[col]
    row[col] = v === undefined ? null : v
  }
  return row
}

/** Supabase row → local Dexie record. Strips sync-only columns; null → undefined
 *  for optional fields (deletedAt stays null — the app filters on `=== null`). */
export function fromRemote(cfg: SyncTableConfig, row: Record<string, unknown>): SyncRow {
  const rec: Record<string, unknown> = {}
  for (const col of cfg.columns) {
    let v = row[col]
    if (col === 'deletedAt') {
      rec[col] = v ?? null
      continue
    }
    if (v === null) v = undefined
    if (v !== undefined) rec[col] = v
  }
  return rec as SyncRow
}
