export type VariantName = 'bcsc' | 'bcwallet'
export type FlowMode = 'simple' | 'advanced'

export interface E2EConfig {
  variant: VariantName
  flow: FlowMode
  onboarding: {
    includeTransferDetour: boolean
    includeSetupTypeInteraction: boolean
    includeHelpDetours: boolean
    authMethod: 'pin' | 'biometric'
  }
  verify: {
    includeStep0: boolean
  }
}

const FLOW_PRESETS: Record<FlowMode, Omit<E2EConfig, 'variant' | 'flow'>> = {
  simple: {
    onboarding: {
      includeTransferDetour: false,
      includeSetupTypeInteraction: false,
      includeHelpDetours: false,
      authMethod: 'pin',
    },
    verify: { includeStep0: false },
  },
  advanced: {
    onboarding: {
      includeTransferDetour: true,
      includeSetupTypeInteraction: true,
      includeHelpDetours: true,
      authMethod: 'biometric',
    },
    verify: { includeStep0: true },
  },
}

/** Maps environment variant names (bcsc-dev, bcwallet-prod, etc.) to the base variant */
function normalizeVariantName(raw: string): VariantName {
  if (raw.startsWith('bcsc')) return 'bcsc'
  if (raw.startsWith('bcwallet')) return 'bcwallet'
  return raw as VariantName
}

export function getE2EConfig(): E2EConfig {
  const variant = normalizeVariantName(process.env.VARIANT || 'bcsc')
  const flow = (process.env.E2E_FLOW || 'simple') as FlowMode

  const preset = FLOW_PRESETS[flow]
  if (!preset) throw new Error(`Unknown flow mode: ${flow}`)

  return { variant, flow, ...preset }
}
