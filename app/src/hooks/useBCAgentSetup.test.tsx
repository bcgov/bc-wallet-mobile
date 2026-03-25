jest.mock('@/store', () => ({
  BCLocalStorageKeys: {
    GenesisTransactions: 'GenesisTransactions',
  },
  useStore: jest.fn(),
}))

import { ConnectionRepository, MediationRepository, OutOfBandRepository } from '@credo-ts/core'
import { act, renderHook } from '@testing-library/react-native'
import useBCAgentSetup from './useBCAgentSetup'

import { PersistentStorage, useServices, useStore as useStoreBifold } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import moment from 'moment'

// ---- MOCKS ----

jest.mock('@bifold/core', () => ({
  useStore: jest.fn(),
  useServices: jest.fn(),
  createLinkSecretIfRequired: jest.fn(),
  migrateToAskar: jest.fn(),
  PersistentStorage: {
    fetchValueForKey: jest.fn(),
    storeValueForKey: jest.fn(),
  },
  TOKENS: {},
  DispatchAction: {
    DID_MIGRATE_TO_ASKAR: 'DID_MIGRATE_TO_ASKAR',
  },
}))

jest.mock('@/utils/PushNotificationsHelper', () => ({
  activate: jest.fn(),
}))

jest.mock('@/utils/bc-agent-modules', () => ({
  getBCAgentModules: jest.fn(() => ({})),
}))

jest.mock('@credo-ts/core', () => {
  const actual = jest.requireActual('@credo-ts/core')

  return {
    ...actual,
    Agent: jest.fn().mockImplementation(() => ({
      wallet: {
        open: jest.fn(),
      },
      initialize: jest.fn(),
      mediationRecipient: {
        initiateMessagePickup: jest.fn(),
        stopMessagePickup: jest.fn(),
        findDefaultMediator: jest.fn(),
        requestAndAwaitGrant: jest.fn(),
        notifyKeylistUpdate: jest.fn(),
        setDefaultMediator: jest.fn(),
      },
      connections: {
        sendPing: jest.fn(),
      },
      oob: {
        receiveInvitationFromUrl: jest.fn(),
      },
      dependencyManager: {
        resolve: jest.fn((dependency) => {
          switch (dependency?.name) {
            case 'IndyVdrPoolService':
              return mockPoolService
            case 'ConnectionRepository':
              return mockConnectionRepository
            case 'MediationRepository':
              return mockMediationRepository
            case 'OutOfBandRepository':
              return mockOutOfBandRepository
            default:
              return {}
          }
        }),
      },
      registerOutboundTransport: jest.fn(),
      shutdown: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
      },
    })),
  }
})

const createMockAgent = () => {
  return {
    wallet: {
      open: jest.fn().mockResolvedValue(undefined),
    },
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    mediationRecipient: {
      initiateMessagePickup: jest.fn().mockResolvedValue(undefined),
      stopMessagePickup: jest.fn().mockResolvedValue(undefined),
      findDefaultMediator: jest.fn().mockResolvedValue(null),
      requestAndAwaitGrant: jest.fn().mockResolvedValue({}),
      setDefaultMediator: jest.fn().mockResolvedValue(undefined),
      notifyKeylistUpdate: jest.fn().mockResolvedValue(undefined),
    },
    dependencyManager: {
      resolve: jest.fn((dependency) => {
        switch (dependency?.name) {
          case 'IndyVdrPoolService':
            return mockPoolService
          case 'ConnectionRepository':
            return mockConnectionRepository
          case 'MediationRepository':
            return mockMediationRepository
          case 'OutOfBandRepository':
            return mockOutOfBandRepository
          default:
            return {}
        }
      }),
    },
    context: {},
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
    connections: {
      sendPing: jest.fn().mockResolvedValue(undefined),
    },
    registerOutboundTransport: jest.fn(),
  } as unknown as Agent
}

jest.mock('react-native-config', () => ({
  Config: {
    MEDIATION_EXPIRED_THRESHOLD_DAYS: '90',
    INDY_VDR_PROXY_URL: '',
  },
}))

// ---- HELPERS ----

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockStore = {
  preferences: {
    walletName: 'Test Wallet',
    selectedMediator: 'http://mediator',
    usePushNotifications: false,
  },
  developer: {
    enableProxy: false,
  },
  migration: {
    didMigrateToAskar: true,
  },
}

const mockConnectionRepository = {
  getAll: jest.fn().mockResolvedValue([]),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
}

const mockPoolService = {
  refreshPoolConnections: jest.fn(),
  getAllPoolTransactions: jest.fn().mockResolvedValue([]),
  getPoolForDid: jest.fn().mockResolvedValue({
    pool: {
      submitRequest: jest.fn(),
    },
  }),
}

const mockMediationRepository = {
  delete: jest.fn(),
  save: jest.fn(),
}

const mockOutOfBandRepository = {
  getById: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
}

// ---- TESTS ----

describe('useBCAgentSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.mocked(useStoreBifold).mockReturnValue([mockStore as any, jest.fn()])

    jest.mocked(useServices).mockReturnValue([mockLogger, [], { stop: jest.fn(), start: jest.fn() }, [], []] as any)
  })

  it('should initialize a new agent successfully', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    expect(Agent).toHaveBeenCalled()
    expect(result.current.agent).toBeTruthy()
  })

  it('should restart existing agent if present', async () => {
    const mockAgent = createMockAgent()

    // Make sure restart doesn't fail
    ;(mockAgent.wallet.open as jest.Mock).mockResolvedValue(undefined)
    ;(mockAgent.initialize as jest.Mock).mockResolvedValue(undefined)

    // First call → create agent
    ;(Agent as jest.Mock).mockImplementation(() => mockAgent)

    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    // Clear calls so we only track restart behavior
    ;(mockAgent.wallet.open as jest.Mock).mockClear()
    ;(mockAgent.initialize as jest.Mock).mockClear()

    // Second call → should restart existing agent
    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    expect(mockAgent.wallet.open).toHaveBeenCalled()
    expect(mockAgent.initialize).toHaveBeenCalled()
  })

  it('should call recovery if initialization fails', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agentInstance = new Agent({} as any)
    ;(agentInstance.initialize as jest.Mock).mockRejectedValue(new Error('fail'))
    ;(Agent as jest.Mock).mockImplementation(() => agentInstance)

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error initiating message pickup'))
  })

  it('should shutdown and clear agent', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    const agentBefore = result.current.agent

    await act(async () => {
      await result.current.shutdownAndClearAgentIfExists()
    })

    expect(agentBefore?.shutdown).toHaveBeenCalled()
    expect(result.current.agent).toBeNull()
  })

  it('should not recover mediation if not expired via initializeAgent', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    // Mock a pre-made agent
    const existingAgent = createMockAgent()
    existingAgent.wallet.open = jest.fn().mockResolvedValue(undefined)
    existingAgent.initialize = jest.fn().mockResolvedValue(undefined)
    existingAgent.mediationRecipient.initiateMessagePickup = jest.fn().mockRejectedValue(new Error('pickup failed'))
    existingAgent.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    const mockResolve = (impl: any) => impl as unknown as typeof existingAgent.dependencyManager.resolve
    existingAgent.dependencyManager.resolve = mockResolve((dep: any) => {
      if (dep === ConnectionRepository) {
        return {
          getById: jest.fn().mockResolvedValue({
            id: 'conn1',
            getTag: jest.fn().mockReturnValue(new Date().toISOString()),
            updatedAt: new Date(),
          }),
          getAll: jest.fn().mockResolvedValue([]),
        }
      }
      return {}
    })

    // Mock Agent constructor to always return our mock agent
    ;(Agent as jest.Mock).mockImplementation(() => existingAgent)

    // Also make sure cached ledgers are empty so new agent creation triggers
    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow('Mediation connection is not passed the expiration threshold, no need to reset mediation')

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('below the expiration threshold'))
  })

  it('should rollback if mediation recovery fails via initializeAgent', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    // --- Step 1: create a mock agent ---
    const agentInstance = createMockAgent()

    // Force recovery path
    agentInstance.initialize = jest.fn().mockRejectedValue(new Error('fail during initialize'))

    // Ensure nested objects exist
    ;(agentInstance as any).oob = {
      receiveInvitationFromUrl: jest.fn().mockRejectedValue(new Error('fail')),
    }
    agentInstance.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const oldDate = moment().subtract(1000, 'days').toISOString()
    const connectionRepository = {
      getById: jest.fn().mockResolvedValue({
        id: 'conn1',
        getTag: jest.fn().mockReturnValue(oldDate),
        updatedAt: new Date(oldDate),
        outOfBandId: 'oob1',
      }),
      delete: jest.fn(),
      save: jest.fn(),
    }
    const outOfBandRepository = { getById: jest.fn(), delete: jest.fn(), save: jest.fn() }

    agentInstance.dependencyManager.resolve = jest.fn((dep) => {
      if (dep === MediationRepository) {
        return mediationRepository
      }
      if (dep === ConnectionRepository) {
        return connectionRepository
      }
      if (dep === OutOfBandRepository) {
        return outOfBandRepository
      }
      return {}
    }) as any

    // --- Step 2: force new agent path ---
    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)
    ;(Agent as jest.Mock).mockImplementation(() => agentInstance)

    // --- Step 3: Run initializeAgent, which will call recoverMediationIfExpired and fail ---
    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow('fail')

    // --- Step 4: Ensure rollback is called ---
    expect(mediationRepository.save).toHaveBeenCalledWith(agentInstance.context, expect.any(Object))
    expect(connectionRepository.save).toHaveBeenCalled()
  })
})
