export type VariantName = 'bcsc' | 'bc-wallet'

export interface E2EConfig {
  variant: VariantName
}

/** Maps environment variant names (bcsc-dev, bc-wallet-prod, etc.) to the base variant */
function normalizeVariantName(raw: string): VariantName {
  if (raw.startsWith('bcsc')) return 'bcsc'
  if (raw.startsWith('bc-wallet') || raw.startsWith('bcwallet')) return 'bc-wallet'
  return raw as VariantName
}

export function getE2EConfig(): E2EConfig {
  const variant = normalizeVariantName(process.env.VARIANT || 'bcsc')
  return { variant }
}
