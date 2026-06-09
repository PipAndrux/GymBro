import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export type Tier = 'free' | 'pro' | 'lifetime'

/**
 * Maps each gated feature to the minimum tier required to access it.
 * For now everyone is 'lifetime' so all features pass through.
 * Flip defaults here when going public.
 */
export const FEATURES = {
  // Future paid features (real per-use / storage cost)
  aiCoach: 'pro',
  progressPhotos: 'pro',
  // Cosmetic (would be pro eventually)
  themes: 'pro',
  // Everything else is free forever
  workouts: 'free',
  food: 'free',
  measurements: 'free',
  history: 'free',
  dataExport: 'free',
  social: 'free',
} as const satisfies Record<string, Tier>

export type FeatureKey = keyof typeof FEATURES

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, lifetime: 2 }

export function canAccess(feature: FeatureKey, userTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[FEATURES[feature]]
}

/** Returns the user's tier. Reads from local DB; defaults to 'lifetime'. */
export function useTier(): Tier {
  const row = useLiveQuery(() => db.settings.get('tier'), [])
  return (row?.value as Tier | undefined) ?? 'lifetime'
}
