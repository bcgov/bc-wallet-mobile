jest.mock('@/configs/ledgers/indy/ledgerResolver', () => ({
  ledgerResolver: {
    checkForUpdates: jest.fn().mockResolvedValue(undefined),
    ledgers: [],
    remoteEnabled: false,
    set logger(_: unknown) {},
  },
}))
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
  DidCommKeylistUpdateAction,
  DidCommMediationRepository,
  DidCommMediatorPickupStrategy,
  DidCommOutOfBandRepository,
} from '@credo-ts/didcomm'
import { IndyVdrPoolService } from '@credo-ts/indy-vdr'

import { act, renderHook } from '@testing-library/react-native'
import useBCAgentSetup from './useBCAgentSetup'

import { CACHED_LEDGER_READ_TIMEOUT_MS } from '@/constants'
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
    // Sentinel so assertions on agent.context cannot pass against undefined.
    context: { contextCorrelationId: 'test-agent' } as any,
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
    // clearMocks only clears call history, so the Agent factory and the ledger read
    // have to be re-armed here or each test inherits the previous test's implementation.
    jest.mocked(Agent).mockImplementation(() => createMockAgent())
    jest.mocked(PersistentStorage.fetchValueForKey).mockResolvedValue(undefined)

    jest.mocked(useStoreBifold).mockReturnValue([mockStore as any, jest.fn()])
    jest
      .mocked(useServices)
      .mockReturnValue([mockLogger, { stop: jest.fn(), start: jest.fn() }, undefined, [], []] as any)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
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
    expect(result.current.agent?.initialize).toHaveBeenCalled()
    expect(result.current.agent?.didcomm.mediationRecipient.initiateMessagePickup).toHaveBeenCalled()
  })

  it('should still create an agent when the cached ledger read never settles', async () => {
    jest.useFakeTimers()
    jest.spyOn(PersistentStorage, 'fetchValueForKey').mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      const initializePromise = result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
      await jest.advanceTimersByTimeAsync(CACHED_LEDGER_READ_TIMEOUT_MS)
      await initializePromise
    })

    expect(Agent).toHaveBeenCalled()
    expect(result.current.agent?.initialize).toHaveBeenCalled()
    expect(result.current.agent?.didcomm.mediationRecipient.initiateMessagePickup).toHaveBeenCalled()
  })

  it('should restart existing agent if present', async () => {
    const mockAgent = createMockAgent()

    jest.mocked(Agent).mockImplementation(() => mockAgent)

    const { result } = renderHook(() => useBCAgentSetup())

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    await act(async () => {
      await result.current.shutdownAndClearAgentIfExists()
    })
    expect(result.current.agent).toBeNull()

    jest.clearAllMocks()

    await act(async () => {
      await result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
    })

    // The Agent mock hands back the same instance on every call, so only the
    // constructor not being called again tells a restart from a fresh build.
    expect(Agent).not.toHaveBeenCalled()
    expect(mockAgent.initialize).toHaveBeenCalledTimes(1)
    expect(mockAgent.didcomm.mediationRecipient.initiateMessagePickup).toHaveBeenCalledWith(
      undefined,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
    expect(result.current.agent).toBe(mockAgent)
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

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue({
        getTag: jest.fn().mockReturnValue(new Date().toISOString()),
        updatedAt: new Date(),
      }),
      delete: jest.fn(),
      save: jest.fn(),
    }
    const outOfBandRepository = { getById: jest.fn(), delete: jest.fn(), save: jest.fn() }

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
      if (dep === IndyVdrPoolService) {
        return createMockPoolService()
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
    jest.mocked(Agent).mockImplementation(() => agent)

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    expect(agent.didcomm.mediationRecipient.initiateMessagePickup).toHaveBeenCalledTimes(1)
    expect(connectionRepository.getById).toHaveBeenCalledWith(agent.context, 'conn1')
    expect(mediationRepository.delete).not.toHaveBeenCalled()
    expect(connectionRepository.delete).not.toHaveBeenCalled()
    expect(agent.didcomm.oob.receiveInvitationFromUrl).not.toHaveBeenCalled()
    expect(result.current.agent).toBe(agent)
  })

  it('should rollback if mediation recovery fails and new connection is established so do not recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const oldMediationRecord = { id: 'med1', connectionId: 'conn1', recipientKeys: ['key1'] }
    const oldConnection = {
      id: 'conn1',
      getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
      outOfBandId: 'oob1',
      updatedAt: moment().subtract(100, 'days').toDate(),
    }
    const oldOobRecord = { id: 'oob1' }
    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest.fn().mockResolvedValue(oldConnection),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue(oldOobRecord),
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
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue(oldMediationRecord)
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

    await act(async () => {
      await expect(
        result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
      ).rejects.toThrow('Failed to establish a new connection for mediation recovery')
    })

    expect(mediationRepository.save).toHaveBeenCalledWith(agent.context, oldMediationRecord)
    expect(connectionRepository.save).toHaveBeenCalledWith(agent.context, oldConnection)
    expect(outOfBandRepository.save).not.toHaveBeenCalled()
  })

  it('should rollback if mediation recovery fails and new connection is not established so recover oob invitation', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()

    const oldMediationRecord = { id: 'med1', connectionId: 'conn1', recipientKeys: ['key1'] }
    const oldConnection = {
      id: 'conn1',
      getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
      outOfBandId: 'oob1',
      updatedAt: moment().subtract(100, 'days').toDate(),
    }
    const oldOobRecord = { id: 'oob1' }
    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      save: jest.fn(),
      getById: jest.fn().mockResolvedValue(oldConnection),
      delete: jest.fn(),
    }
    const outOfBandRepository = {
      getById: jest.fn().mockResolvedValue(oldOobRecord),
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
    agent.didcomm.mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue(oldMediationRecord)
    agent.didcomm.oob.receiveInvitationFromUrl = jest
      .fn()
      .mockRejectedValue(new Error('Failed to establish a new connection for mediation recovery'))
    ;(Agent as jest.Mock).mockImplementation(() => agent)

    await act(async () => {
      await expect(
        result.current.initializeAgent({ id: 'wallet-id', key: 'wallet-key', salt: 'wallet-salt' })
      ).rejects.toThrow('Failed to establish a new connection for mediation recovery')
    })

    expect(mediationRepository.save).toHaveBeenCalledWith(agent.context, oldMediationRecord)
    expect(connectionRepository.save).toHaveBeenCalledWith(agent.context, oldConnection)
    expect(outOfBandRepository.save).toHaveBeenCalledWith(agent.context, oldOobRecord)
  })

  it('on fail recover connection and mediation keys are re-established', async () => {
    const { result } = renderHook(() => useBCAgentSetup())

    const agent = createMockAgent()
    const { mediationRecipient } = agent.didcomm

    const oldMediationRecord = { id: 'med1', connectionId: 'conn1', recipientKeys: ['key1', 'key2'] }
    const oldConnection = {
      id: 'conn1',
      getTag: jest.fn().mockReturnValue(moment().subtract(100, 'days').toISOString()),
      outOfBandId: 'oob1',
      updatedAt: moment().subtract(100, 'days').toDate(),
    }
    const freshConnection = { id: 'test-connection-id' }
    const newMediationRecord = { id: 'med2', recipientKeys: ['newKey1'] }

    const mediationRepository = { delete: jest.fn(), save: jest.fn() }
    const connectionRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      getById: jest.fn().mockResolvedValueOnce(oldConnection).mockResolvedValueOnce(freshConnection),
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
      if (dep === IndyVdrPoolService) {
        return createMockPoolService()
      }
      return {}
    }) as any

    mediationRecipient.initiateMessagePickup = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed to initiate message pickup'))
      .mockResolvedValueOnce(undefined)
    mediationRecipient.findDefaultMediator = jest.fn().mockResolvedValue(oldMediationRecord)
    mediationRecipient.setDefaultMediator = jest.fn().mockResolvedValue(undefined)
    mediationRecipient.requestAndAwaitGrant = jest.fn().mockResolvedValue(newMediationRecord)
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
    jest.mocked(Agent).mockImplementation(() => agent)

    await act(async () => {
      await result.current.initializeAgent({
        id: 'wallet-id',
        key: 'wallet-key',
        salt: 'wallet-salt',
      })
    })

    expect(mediationRepository.delete).toHaveBeenCalledWith(agent.context, oldMediationRecord)
    expect(connectionRepository.delete).toHaveBeenCalledWith(agent.context, oldConnection)
    expect(outOfBandRepository.getById).toHaveBeenCalledWith(agent.context, 'oob1')
    expect(outOfBandRepository.delete).toHaveBeenCalledWith(agent.context, { id: 'oob1' })
    expect(agent.didcomm.oob.receiveInvitationFromUrl).toHaveBeenCalledWith('http://mediator', expect.anything())
    expect(connectionRepository.getById).toHaveBeenNthCalledWith(2, agent.context, 'test-connection-id')
    expect(agent.didcomm.connections.sendPing).toHaveBeenCalledWith('test-connection-id', { responseRequested: true })
    expect(mediationRecipient.requestAndAwaitGrant).toHaveBeenCalledWith(freshConnection)
    expect(mediationRecipient.notifyKeylistUpdate).toHaveBeenCalledTimes(2)
    expect(mediationRecipient.notifyKeylistUpdate).toHaveBeenNthCalledWith(
      1,
      freshConnection,
      'key1',
      DidCommKeylistUpdateAction.add
    )
    expect(mediationRecipient.notifyKeylistUpdate).toHaveBeenNthCalledWith(
      2,
      freshConnection,
      'key2',
      DidCommKeylistUpdateAction.add
    )
    expect(mediationRecipient.setDefaultMediator).toHaveBeenCalledWith(newMediationRecord)
    expect(mediationRecipient.initiateMessagePickup).toHaveBeenLastCalledWith(
      newMediationRecord,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
    expect(mediationRepository.save).not.toHaveBeenCalled()
    expect(connectionRepository.save).not.toHaveBeenCalled()
    expect(outOfBandRepository.save).not.toHaveBeenCalled()
    expect(result.current.agent).toBe(agent)
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
