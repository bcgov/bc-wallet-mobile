export type FlowMode = 'simple' | 'advanced'

export interface FlowConfig {
  mode: FlowMode
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

const FLOWS: Record<FlowMode, FlowConfig> = {
  simple: {
    mode: 'simple',
    onboarding: {
      includeTransferDetour: false,
      includeSetupTypeInteraction: false,
      includeHelpDetours: false,
      authMethod: 'pin',
    },
    verify: { includeStep0: false },
  },
  advanced: {
    mode: 'advanced',
    onboarding: {
      includeTransferDetour: true,
      includeSetupTypeInteraction: true,
      includeHelpDetours: true,
      authMethod: 'biometric',
    },
    verify: { includeStep0: true },
  },
}

export function getFlowConfig(): FlowConfig {
  const mode = (process.env.E2E_FLOW || 'simple') as FlowMode
  const config = FLOWS[mode]
  if (!config) throw new Error(`Unknown flow mode: ${mode}`)
  return config
}
