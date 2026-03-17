export type VariantName = 'bcsc' | 'bcwallet'

export interface VariantConfig {
  name: VariantName
}

export const VARIANTS: Record<VariantName, VariantConfig> = {
  bcsc: { name: 'bcsc' },
  bcwallet: { name: 'bcwallet' },
}

/** Maps environment variant names (bcsc-dev, bcwallet-prod, etc.) to the base variant */
function normalizeVariantName(raw: string): VariantName {
  if (raw.startsWith('bcsc')) return 'bcsc'
  if (raw.startsWith('bcwallet')) return 'bcwallet'
  return raw as VariantName
}

export function getVariantConfig(): VariantConfig {
  const raw = process.env.VARIANT || 'bcsc'
  const name = normalizeVariantName(raw)
  const config = VARIANTS[name]
  if (!config) throw new Error(`Unknown variant: ${raw} (resolved to ${name})`)
  return config
}
