export type VariantName = 'bcsc' | 'bcwallet'

export interface VariantConfig {
  name: VariantName
  onboarding: {
    hasCarousel: boolean
    hasAgreementCheckbox: boolean
    carouselSteps: number
  }
  selectors: {
    addAccount?: string // BCSC only
    agreeCheckbox?: string // BCWallet only
    continueButton: string
    carouselNext?: string
  }
}

export const VARIANTS: Record<VariantName, VariantConfig> = {
  bcsc: {
    name: 'bcsc',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      addAccount: 'com.ariesbifold:id/AddAccount',
      continueButton: 'com.ariesbifold:id/Continue',
      carouselNext: 'com.ariesbifold:id/CarouselNext',
    },
  },
  bcwallet: {
    name: 'bcwallet',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      agreeCheckbox: 'com.ariesbifold:id/AgreeCheckbox',
      continueButton: 'com.ariesbifold:id/Continue',
    },
  },
}

/** Maps legacy variant names (bcsc-dev, bcwallet-prod, etc.) to bcsc or bcwallet */
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
