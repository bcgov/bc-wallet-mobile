jest.mock('@/store', () => ({
  BCLocalStorageKeys: {
    GenesisTransactions: 'GenesisTransactions',
  },
  useStore: jest.fn(),
}))

import {
  Agent,
  ConnectionRecord,
  ConnectionRepository,
  DidExchangeRole,
  DidExchangeState,
  MediationRepository,
  OutOfBandRepository,
} from '@credo-ts/core'

import { act, renderHook } from '@testing-library/react-native'
import useBCAgentSetup from './useBCAgentSetup'

import { PersistentStorage, useServices, useStore as useStoreBifold } from '@bifold/core'
import moment from 'moment'

// ---- SHARED MOCK FACTORIES ----

const createMockRepositories = () => {
  const connectionRepository = {
    getAll: jest.fn().mockResolvedValue([]),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  }

  const mediationRepository = {
    delete: jest.fn(),
    save: jest.fn(),
  }

  const outOfBandRepository = {
    getById: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
  }

  return {
    connectionRepository,
    mediationRepository,
    outOfBandRepository,
  }
}

const createMockPoolService = () => ({
  refreshPoolConnections: jest.fn(),
  getAllPoolTransactions: jest.fn().mockResolvedValue([]),
  getPoolForDid: jest.fn().mockResolvedValue({
    pool: { submitRequest: jest.fn() },
  }),
})

const createMockAgent = (overrides: Partial<Agent> = {}): Agent => {
  const { connectionRepository, mediationRepository, outOfBandRepository } = createMockRepositories()

  const poolService = createMockPoolService()

  const agent: Partial<Agent> = {
    wallet: {
      open: jest.fn().mockResolvedValue(undefined),
      agentContext: {} as any,
      wallet: {} as any,
      storageUpdateService: {} as any,
      logger: mockLogger,
    } as any,
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),

    mediationRecipient: {
      initiateMessagePickup: jest.fn(),
      stopMessagePickup: jest.fn(),
      findDefaultMediator: jest.fn().mockResolvedValue(null),
      requestAndAwaitGrant: jest.fn().mockResolvedValue({}),
      setDefaultMediator: jest.fn(),
      notifyKeylistUpdate: jest.fn(),
    } as any,

    oob: {
      receiveInvitationFromUrl: jest.fn().mockResolvedValue(
        new ConnectionRecord({
          id: 'test-connection-id',
          state: DidExchangeState.Completed,
          role: DidExchangeRole.Responder,
          theirDid: 'did:example:123',
        })
      ),
    } as any,

    dependencyManager: {
      resolve: jest.fn((dep: any) => {
        if (dep === ConnectionRepository) {
          return connectionRepository
        }
        if (dep === MediationRepository) {
          return mediationRepository
        }
        if (dep === OutOfBandRepository) {
          return outOfBandRepository
        }
        if (dep?.name === 'IndyVdrPoolService') {
          return poolService
        }
        return {}
      }),
    } as any,

    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      eventEmitter: {},
      stop$: { subscribe: jest.fn() },
      observable: { subscribe: jest.fn() },
    } as any,
    connections: { sendPing: jest.fn() } as any,
    registerOutboundTransport: jest.fn(),
  }

  return {
    ...agent,
    ...overrides,
  } as Agent
}

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
    Agent: jest.fn(() => createMockAgent()),
  }
})

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

    ;(Agent as jest.Mock).mockImplementation(() => mockAgent)

    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    jest.clearAllMocks()

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    expect(mockAgent.wallet.open).toHaveBeenCalled()
    expect(mockAgent.initialize).toHaveBeenCalled()
  })

  it('should call recovery if initialization fails', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agentInstance = createMockAgent({
      initialize: jest.fn().mockRejectedValue(new Error('fail')),
    })

    ;(Agent as jest.Mock).mockImplementation(() => agentInstance)

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('should shutdown and clear agent', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    const agentBefore = result.current.agent

    await act(async () => {
      await result.current.shutdownAndClearAgentIfExists()
    })

    expect(agentBefore?.shutdown).toHaveBeenCalled()
    expect(result.current.agent).toBeNull()
  })

  it('should not recover mediation if not expired', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()
    agent.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })

    agent.dependencyManager.resolve = jest.fn((dep: any) => {
      if (dep === ConnectionRepository) {
        return {
          getById: jest.fn().mockResolvedValue({
            getTag: jest.fn().mockReturnValue(new Date().toISOString()),
            updatedAt: new Date(),
          }),
        }
      }
      return {}
    }) as any
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow()

    expect(mockLogger.info).toHaveBeenCalled()
  })

  it('should rollback if mediation recovery fails and new connection is established so do not recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent({
      initialize: jest.fn().mockRejectedValue(new Error('fail')),
    })

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest
        .fn()
        .mockResolvedValue({
          getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
          outOfBandId: 'oob1',
          updatedAt: moment().subtract(100, 'days').toDate(),
        }),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue({ id: 'oob1' }),
      delete: jest.fn(),
      save: jest.fn(),
    }

    agent.dependencyManager.resolve = jest.fn((dep: any) => {
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
    agent.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.oob.receiveInvitationFromUrl = jest.fn().mockResolvedValue({
      outOfBandRecord: { id: 'oob1' },
      connectionRecord: {
        id: 'test-connection-id',
        state: DidExchangeState.Completed,
        role: DidExchangeRole.Responder,
        theirDid: 'did:example:123',
      },
    })
    agent.connections.sendPing = jest
      .fn()
      .mockRejectedValue(new Error('Failed to establish a new connection for mediation recovery'))
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow()

    expect(mediationRepository.save).toHaveBeenCalled()
    expect(connectionRepository.save).toHaveBeenCalled()
  })

  it('should rollback if mediation recovery fails and new connection is not established so recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent({
      initialize: jest.fn().mockRejectedValue(new Error('fail')),
    })

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest
        .fn()
        .mockResolvedValue({
          getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
          outOfBandId: 'oob1',
          updatedAt: moment().subtract(100, 'days').toDate(),
        }),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue({ id: 'oob1' }),
      delete: jest.fn(),
      save: jest.fn(),
    }

    agent.dependencyManager.resolve = jest.fn((dep: any) => {
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
    agent.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.oob.receiveInvitationFromUrl = jest
      .fn()
      .mockRejectedValue(new Error('Failed to establish a new connection for mediation recovery'))
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow()

    expect(mediationRepository.save).toHaveBeenCalled()
    expect(connectionRepository.save).toHaveBeenCalled()
    expect(outOfBandRepository.save).toHaveBeenCalled()
  })

  it('happy path where connection and mediation keys are re-established', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent({
      initialize: jest.fn().mockRejectedValue(new Error('fail')),
    })

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest
        .fn()
        .mockResolvedValue({
          getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
          outOfBandId: 'oob1',
          updatedAt: moment().subtract(100, 'days').toDate(),
        }),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue({ id: 'oob1' }),
      delete: jest.fn(),
      save: jest.fn(),
    }
    agent.dependencyManager.resolve = jest.fn((dep: any) => {
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

    agent.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.mediationRecipient.setDefaultMediator = jest.fn().mockResolvedValue(undefined)
    agent.mediationRecipient.initiateMessagePickup = jest.fn().mockResolvedValue(undefined)
    agent.mediationRecipient.requestAndAwaitGrant = jest.fn().mockResolvedValue({
      recipientKeys: ['newKey1'],
    })
    agent.oob.receiveInvitationFromUrl = jest.fn().mockResolvedValue({
      outOfBandRecord: { id: 'oob1' },
      connectionRecord: {
        id: 'test-connection-id',
        state: DidExchangeState.Completed,
        role: DidExchangeRole.Responder,
        theirDid: 'did:example:123',
      },
    })
    agent.connections.sendPing = jest.fn().mockResolvedValue(undefined)
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await expect(
      result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    ).rejects.toThrow()

    expect(mediationRepository.save).not.toHaveBeenCalled()
    expect(connectionRepository.save).not.toHaveBeenCalled()
    expect(outOfBandRepository.save).not.toHaveBeenCalled()
    expect(agent.mediationRecipient.setDefaultMediator).toHaveBeenCalled()
  })
})
