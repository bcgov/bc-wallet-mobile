export type VariantFamily = 'bcsc' | 'bcwallet'
export type VariantName = 'bcsc-dev' | 'bcsc-test' | 'bcsc-qa' | 'bcsc-prod' | 'bcwallet-prod'

export interface VariantConfig {
  family: VariantFamily
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
  'bcsc-dev': {
    family: 'bcsc',
    name: 'bcsc-dev',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      addAccount: 'com.ariesbifold:id/AddAccount',
      continueButton: 'com.ariesbifold:id/Continue',
      carouselNext: 'com.ariesbifold:id/CarouselNext',
    },
  },
  'bcsc-test': {
    family: 'bcsc',
    name: 'bcsc-test',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      addAccount: 'com.ariesbifold:id/AddAccount',
      continueButton: 'com.ariesbifold:id/Continue',
      carouselNext: 'com.ariesbifold:id/CarouselNext',
    },
  },
  'bcsc-qa': {
    family: 'bcsc',
    name: 'bcsc-qa',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      addAccount: 'com.ariesbifold:id/AddAccount',
      continueButton: 'com.ariesbifold:id/Continue',
      carouselNext: 'com.ariesbifold:id/CarouselNext',
    },
  },
  'bcsc-prod': {
    family: 'bcsc',
    name: 'bcsc-prod',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      addAccount: 'com.ariesbifold:id/AddAccount',
      continueButton: 'com.ariesbifold:id/Continue',
      carouselNext: 'com.ariesbifold:id/CarouselNext',
    },
  },
  'bcwallet-prod': {
    family: 'bcwallet',
    name: 'bcwallet-prod',
    onboarding: { hasCarousel: true, hasAgreementCheckbox: false, carouselSteps: 3 },
    selectors: {
      agreeCheckbox: 'com.ariesbifold:id/AgreeCheckbox',
      continueButton: 'com.ariesbifold:id/Continue',
    },
  },
}

export function getVariantConfig(): VariantConfig {
  const name = (process.env.VARIANT || 'bcsc-dev') as VariantName
  const config = VARIANTS[name]
  if (!config) throw new Error(`Unknown variant: ${name}`)
  return config
}
