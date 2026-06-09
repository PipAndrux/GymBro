import type { ReactNode } from 'react'
import { useTier, canAccess, type FeatureKey } from '../lib/tier'

interface GatedProps {
  feature: FeatureKey
  /** Rendered when the feature is locked (omit to render nothing). */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renders children if the user's tier grants access to the feature.
 * Currently everyone is 'lifetime' so this always renders children.
 * When going public, flip the default tier in useTier() and this gate activates.
 */
export default function Gated({ feature, fallback = null, children }: GatedProps) {
  const tier = useTier()
  return canAccess(feature, tier) ? <>{children}</> : <>{fallback}</>
}
