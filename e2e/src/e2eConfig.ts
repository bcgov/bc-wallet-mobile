import { TestUsers } from './constants.js'

export type VariantName = 'bcsc' | 'bc-wallet'
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
    verifyCardType: 'combined' | 'photo' | 'nonPhoto' | 'na'
    testUser: {
      username: string
      cardSerial: string
      dob: string
      documentNumber: string
    }
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
    verify: { includeStep0: false, verifyCardType: 'combined', testUser: TestUsers.basic },
  },
  advanced: {
    onboarding: {
      includeTransferDetour: true,
      includeSetupTypeInteraction: true,
      includeHelpDetours: true,
      authMethod: 'pin',
    },
    verify: { includeStep0: false, verifyCardType: 'nonPhoto', testUser: TestUsers.nonPhoto },
  },
}

/** Maps environment variant names (bcsc-dev, bc-wallet-prod, etc.) to the base variant */
function normalizeVariantName(raw: string): VariantName {
  if (raw.startsWith('bcsc')) return 'bcsc'
  if (raw.startsWith('bc-wallet') || raw.startsWith('bcwallet')) return 'bc-wallet'
  return raw as VariantName
}

export function getE2EConfig(): E2EConfig {
  const variant = normalizeVariantName(process.env.VARIANT || 'bcsc')
  const flow = (process.env.E2E_FLOW || 'simple') as FlowMode

  const preset = FLOW_PRESETS[flow]
  if (!preset) throw new Error(`Unknown flow mode: ${flow}`)

  return { variant, flow, ...preset }
}
