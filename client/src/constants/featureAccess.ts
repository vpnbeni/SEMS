import featureCatalog from './tenantFeatureCatalog.json'

export type TenantFeatureToggles = Record<string, boolean> | null | undefined

type FeatureCatalogEntry = {
  key: string
  label: string
  path: string
  group: string
  prefixes: string[]
  fallbackPriority?: number
}

const FEATURE_CATALOG = featureCatalog as FeatureCatalogEntry[]

const FEATURE_RULES = FEATURE_CATALOG.map(({ key, prefixes }) => ({
  key,
  prefixes,
}))

const FALLBACK_ROUTE_PRIORITY = FEATURE_CATALOG
  .filter((entry) => typeof entry.fallbackPriority === 'number')
  .sort((left, right) => (left.fallbackPriority ?? Number.MAX_SAFE_INTEGER) - (right.fallbackPriority ?? Number.MAX_SAFE_INTEGER))
  .map((entry) => entry.path)

const matchesPrefix = (pathname: string, prefix: string): boolean => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

const resolveFeatureKeyFromPath = (pathname: string): string | null => {
  for (const rule of FEATURE_RULES) {
    if (rule.prefixes.some((prefix) => matchesPrefix(pathname, prefix))) {
      return rule.key
    }
  }

  return null
}

export const isFeatureEnabledForPath = (pathname: string, toggles: TenantFeatureToggles): boolean => {
  const featureKey = resolveFeatureKeyFromPath(pathname)
  if (!featureKey) {
    return true
  }

  return toggles?.[featureKey] !== false
}

export const getFirstEnabledPath = (toggles: TenantFeatureToggles): string | null => {
  const firstEnabled = FALLBACK_ROUTE_PRIORITY.find((path) => isFeatureEnabledForPath(path, toggles))
  return firstEnabled || null
}
