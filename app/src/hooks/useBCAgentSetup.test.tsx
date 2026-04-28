jest.mock('@/store', () => ({
  BCLocalStorageKeys: {
    GenesisTransactions: 'GenesisTransactions',
  },
  useStore: jest.fn(),
}))

import { Agent } from '@credo-ts/core'
import {
  DidCommConnectionRecord,
  DidCommConnectionRepository,
  DidCommDidExchangeRole,
  DidCommDidExchangeState,
  DidCommMediationRepository,
  DidCommOutOfBandRepository,
} from '@credo-ts/didcomm'

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
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),

    didcomm: {
      wallet: {
        open: jest.fn().mockResolvedValue(undefined),
        agentContext: {} as any,
        wallet: {} as any,
        storageUpdateService: {} as any,
        logger: mockLogger,
      } as any,
      mediationRecipient: {
        initiateMessagePickup: jest.fn(),
        stopMessagePickup: jest.fn(),
        findDefaultMediator: jest.fn().mockResolvedValue(null),
        requestAndAwaitGrant: jest.fn().mockResolvedValue({}),
        setDefaultMediator: jest.fn(),
        notifyKeylistUpdate: jest.fn(),
      } as any,
      oob: {
        receiveInvitationFromUrl: jest.fn().mockResolvedValue({
          connectionRecord: new DidCommConnectionRecord({
            id: 'test-connection-id',
            state: DidCommDidExchangeState.Completed,
            role: DidCommDidExchangeRole.Responder,
            theirDid: 'did:example:123',
          }),
        }),
      } as any,
      connections: { sendPing: jest.fn() } as any,
    } as any,

    dependencyManager: {
      resolve: jest.fn((dep: any) => {
        if (dep === DidCommConnectionRepository) {
          return connectionRepository
        }
        if (dep === DidCommMediationRepository) {
          return mediationRepository
        }
        if (dep === DidCommOutOfBandRepository) {
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
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      Agent: {
        value: jest.fn(() => createMockAgent()),
        writable: true,
        configurable: true,
        enumerable: true,
      },
    }
  )
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

  afterEach(() => {
    jest.useRealTimers()
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

    expect(mockAgent.initialize).toHaveBeenCalled()
    expect(mockAgent.didcomm.mediationRecipient.initiateMessagePickup).toHaveBeenCalled()
  })

  it('should call recovery if initialization fails', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agentInstance = createMockAgent()
    agentInstance.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to initiate message pickup'))
    ;(Agent as jest.Mock).mockImplementation(() => agentInstance)

    await act(async () => {
      await expect(
        result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
      ).rejects.toThrow('Failed to initiate message pickup')
    })

    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith('No mediation record found to delete')
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
    agent.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to initiate message pickup'))
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })

    agent.dependencyManager.resolve = jest.fn((dep: any) => {
      if (dep === DidCommConnectionRepository) {
        return {
          getById: jest.fn().mockResolvedValue({
            getTag: jest.fn().mockReturnValue(new Date().toISOString()),
            updatedAt: new Date(),
          }),
        }
      }
      if (dep === 'IndyVdrPoolService') {
        return createMockPoolService()
      }
      return {}
    }) as any
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.initializeAgent({
          id: 'wallet-id',
          key: 'wallet-key',
          salt: 'wallet-salt',
        })
      } catch (error) {
        thrownError = error
      }
    })
    expect(thrownError).toBeInstanceOf(Error)

    expect(mockLogger.info).toHaveBeenCalled()
  })

  it('should rollback if mediation recovery fails and new connection is established so do not recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest.fn().mockResolvedValue({
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
      if (dep === DidCommMediationRepository) {
        return mediationRepository
      }
      if (dep === DidCommConnectionRepository) {
        return connectionRepository
      }
      if (dep === DidCommOutOfBandRepository) {
        return outOfBandRepository
      }
      return {}
    }) as any
    agent.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValue(new Error('Timed out waiting for connection test-connection-id to complete'))
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.didcomm.oob.receiveInvitationFromUrl = jest.fn().mockResolvedValue({
      outOfBandRecord: { id: 'oob1' },
      connectionRecord: {
        id: 'test-connection-id',
        state: DidCommDidExchangeState.Completed,
        role: DidCommDidExchangeRole.Responder,
        theirDid: 'did:example:123',
      },
    })
    agent.didcomm.connections.sendPing = jest
      .fn()
      .mockRejectedValue(new Error('Failed to establish a new connection for mediation recovery'))
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.initializeAgent({
          id: 'wallet-id',
          key: 'wallet-key',
          salt: 'wallet-salt',
        })
      } catch (error) {
        thrownError = error
      }
    })
    expect(thrownError).toBeInstanceOf(Error)

    expect(mediationRepository.save).toHaveBeenCalled()
    expect(connectionRepository.save).toHaveBeenCalled()
  })

  it('should rollback if mediation recovery fails and new connection is not established so recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest.fn().mockResolvedValue({
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
      if (dep === DidCommMediationRepository) {
        return mediationRepository
      }
      if (dep === DidCommConnectionRepository) {
        return connectionRepository
      }
      if (dep === DidCommOutOfBandRepository) {
        return outOfBandRepository
      }
      return {}
    }) as any

    agent.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValue(new Error('Failed to initiate message pickup'))
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.didcomm.oob.receiveInvitationFromUrl = jest
      .fn()
      .mockRejectedValue(new Error('Failed to establish a new connection for mediation recovery'))
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.initializeAgent({
          id: 'wallet-id',
          key: 'wallet-key',
          salt: 'wallet-salt',
        })
      } catch (error) {
        thrownError = error
      }
    })
    expect(thrownError).toBeInstanceOf(Error)

    expect(mediationRepository.save).toHaveBeenCalled()
    expect(connectionRepository.save).toHaveBeenCalled()
    expect(outOfBandRepository.save).toHaveBeenCalled()
  })

  it('on fail recover connection and mediation keys are re-established', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest.fn().mockResolvedValue({
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
      if (dep === DidCommMediationRepository) {
        return mediationRepository
      }
      if (dep === DidCommConnectionRepository) {
        return connectionRepository
      }
      if (dep === DidCommOutOfBandRepository) {
        return outOfBandRepository
      }
      return {}
    }) as any

    agent.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to initiate message pickup'))
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.didcomm.mediationRecipient.setDefaultMediator = jest.fn().mockResolvedValue(undefined)
    agent.didcomm.mediationRecipient.initiateMessagePickup = jest.fn().mockResolvedValue(undefined)
    agent.didcomm.mediationRecipient.requestAndAwaitGrant = jest.fn().mockResolvedValue({
      recipientKeys: ['newKey1'],
    })
    agent.didcomm.oob.receiveInvitationFromUrl = jest.fn().mockResolvedValue({
      outOfBandRecord: { id: 'oob1' },
      connectionRecord: {
        id: 'test-connection-id',
        state: DidCommDidExchangeState.Completed,
        role: DidCommDidExchangeRole.Responder,
        theirDid: 'did:example:123',
      },
    })
    agent.didcomm.connections.sendPing = jest.fn().mockResolvedValue(undefined)
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    let thrownError: unknown
    await act(async () => {
      try {
        await result.current.initializeAgent({
          id: 'wallet-id',
          key: 'wallet-key',
          salt: 'wallet-salt',
        })
      } catch (error) {
        thrownError = error
      }
    })
    expect(thrownError).toBeInstanceOf(Error)

    expect(mediationRepository.save).not.toHaveBeenCalled()
    expect(connectionRepository.save).not.toHaveBeenCalled()
    expect(outOfBandRepository.save).not.toHaveBeenCalled()
  })

  it('should timeout waiting for mediation connection completion and clean up listener', async () => {
    jest.useFakeTimers()

    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'conn1',
          getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
          outOfBandId: 'oob1',
          updatedAt: moment().subtract(100, 'days').toDate(),
        })
        .mockResolvedValueOnce({
          id: 'test-connection-id',
        }),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue({ id: 'oob1' }),
      delete: jest.fn(),
      save: jest.fn(),
    }

    agent.dependencyManager.resolve = jest.fn((dep: any) => {
      if (dep === DidCommMediationRepository) {
        return mediationRepository
      }
      if (dep === DidCommConnectionRepository) {
        return connectionRepository
      }
      if (dep === DidCommOutOfBandRepository) {
        return outOfBandRepository
      }
      return {}
    }) as any
    agent.didcomm.mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValue(new Error('Failed to initiate message pickup'))
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue({
      id: 'med1',
      connectionId: 'conn1',
      recipientKeys: ['key1'],
    })
    agent.didcomm.oob.receiveInvitationFromUrl = jest.fn().mockResolvedValue({
      outOfBandRecord: { id: 'oob1' },
      connectionRecord: {
        id: 'test-connection-id',
        state: DidCommDidExchangeState.RequestSent,
        role: DidCommDidExchangeRole.Responder,
        theirDid: 'did:example:123',
        isReady: false,
      },
    })
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

    await act(async () => {
      const initializePromise = result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
      const expectedRejection = (async () => {
        await expect(initializePromise).rejects.toThrow(
          'Timed out waiting for connection test-connection-id to complete'
        )
      })()

      await jest.advanceTimersByTimeAsync(30000)
      await expectedRejection
    })

    expect(agent.events.on).toHaveBeenCalled()
    expect(agent.events.off).toHaveBeenCalledWith(expect.any(String), expect.any(Function))
    expect(mediationRepository.save).toHaveBeenCalled()
    expect(connectionRepository.save).toHaveBeenCalled()
    expect(outOfBandRepository.save).not.toHaveBeenCalled()
  })
})
