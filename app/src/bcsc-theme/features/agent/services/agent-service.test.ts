import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { PersistentStorage } from '@bifold/core'
import moment from 'moment'

jest.mock('@/store', () => ({
  BCLocalStorageKeys: { GenesisTransactions: 'GenesisTransactions' },
}))
jest.mock('@credo-ts/react-native', () => ({ agentDependencies: {} }))
jest.mock('@credo-ts/didcomm', () => ({
  DidCommMediatorPickupStrategy: {
    PickUpV1: 'PickUpV1',
    PickUpV2: 'PickUpV2',
    PickUpV2LiveMode: 'PickUpV2LiveMode',
    Implicit: 'Implicit',
    None: 'None',
  },
}))
jest.mock('@/utils/bc-agent-modules', () => ({ getBCAgentModules: jest.fn(() => ({})) }))
jest.mock('react-native-fs', () => ({ CachesDirectoryPath: '/tmp' }))

jest.mock('@credo-ts/core', () => ({
  Agent: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    shutdown: jest.fn(),
    modules: { askar: { deleteStore: jest.fn().mockResolvedValue(undefined) } },
  })),
}))

jest.mock('@bifold/core', () => ({
  PersistentStorage: {
    fetchValueForKey: jest.fn(),
    storeValueForKey: jest.fn(),
  },
}))

const mockGetCredentialDefinitionRequest = jest.fn()
const mockGetSchemaRequest = jest.fn()
jest.mock('@hyperledger/indy-vdr-shared', () => ({
  GetCredentialDefinitionRequest: jest.fn().mockImplementation((args) => {
    mockGetCredentialDefinitionRequest(args)
    return { type: 'credDef', args }
  }),
  GetSchemaRequest: jest.fn().mockImplementation((args) => {
    mockGetSchemaRequest(args)
    return { type: 'schema', args }
  }),
}))

const mockPoolService = {
  getPoolForDid: jest.fn(),
  refreshPoolConnections: jest.fn(),
  getAllPoolTransactions: jest.fn(),
}
jest.mock('@credo-ts/indy-vdr', () => ({
  IndyVdrPoolService: jest.fn(),
}))

import {
  AgentWalletSecret,
  buildAgent,
  deleteWalletStore,
  initializeAgent,
  loadCachedLedgers,
  purgeWalletStore,
  restartAgent,
  shutdownAgent,
  warmCache,
} from './agent-service'

const mockFetchValueForKey = PersistentStorage.fetchValueForKey as jest.Mock

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const walletSecret: AgentWalletSecret = { id: 'bc-wallet-bcsc', key: 'test-key' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadCachedLedgers', () => {
  it('returns undefined when no cache exists', async () => {
    mockFetchValueForKey.mockResolvedValue(undefined)

    const result = await loadCachedLedgers()

    expect(result).toBeUndefined()
  })

  it('returns cached transactions when fresh (<1 day old)', async () => {
    const transactions = [{ id: 'ledger-1' }]
    mockFetchValueForKey.mockResolvedValue({
      timestamp: moment().subtract(6, 'hours').toISOString(),
      transactions,
    })

    const result = await loadCachedLedgers()

    expect(result).toEqual(transactions)
  })

  it('returns undefined when cache is stale (>=1 day old)', async () => {
    mockFetchValueForKey.mockResolvedValue({
      timestamp: moment().subtract(2, 'days').toISOString(),
      transactions: [{ id: 'ledger-1' }],
    })

    const result = await loadCachedLedgers()

    expect(result).toBeUndefined()
  })
})

describe('buildAgent', () => {
  const baseOptions = {
    ledgers: [],
    walletSecret,
    walletLabel: 'BC Wallet',
    enableProxy: false,
    logger,
  }

  it('throws a typed AppError (2901) when mediatorUrl is empty', () => {
    let caught: unknown
    try {
      buildAgent({ ...baseOptions, mediatorUrl: '' })
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).statusCode).toBe(2901)
    expect((caught as AppError).appEvent).toBe(AppEventCode.AGENT_INITIALIZATION_ERROR)
    expect((caught as AppError).cause).toBeInstanceOf(Error)
  })

  it('constructs and returns an agent', () => {
    const agent = buildAgent({ ...baseOptions, mediatorUrl: 'https://mediator.example' })

    expect(agent).toBeDefined()
  })
})

describe('restartAgent', () => {
  const makeAgent = () =>
    ({
      initialize: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  it('returns the agent when initialize succeeds', async () => {
    const agent = makeAgent()

    const result = await restartAgent(agent, logger)

    expect(result).toBe(agent)
    expect(agent.initialize).toHaveBeenCalled()
  })

  it('returns undefined and logs a warning when initialize throws', async () => {
    const agent = makeAgent()
    agent.initialize.mockRejectedValue(new Error('init failed'))

    const result = await restartAgent(agent, logger)

    expect(result).toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('init failed'))
  })
})

describe('warmCache', () => {
  const makeAgent = () =>
    ({
      dependencyManager: { resolve: jest.fn(() => mockPoolService) },
      context: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  const credDefs = [
    { did: 'did:indy:a', id: 'cred-def-1' },
    { did: 'did:indy:b', id: 'cred-def-2' },
  ]
  const schemas = [
    { did: 'did:indy:a', id: 'schema-1' },
    { did: 'did:indy:b', id: 'schema-2' },
  ]

  it('pre-resolves each unique issuer DID once before fetching cred-defs/schemas', async () => {
    const agent = makeAgent()
    mockPoolService.getPoolForDid.mockResolvedValue({ pool: { submitRequest: jest.fn() } })

    const credDefsDup = [
      { did: 'did:indy:a', id: 'cred-def-1' },
      { did: 'did:indy:a', id: 'cred-def-2' },
    ]
    const schemasDup = [{ did: 'did:indy:b', id: 'schema-1' }]

    await warmCache(agent, credDefsDup, schemasDup, [], logger)

    // Two distinct DIDs across the inputs → the sequential pre-resolve phase is the
    // first two getPoolForDid calls, one per unique DID (not one per cred-def/schema).
    const preResolveDids = mockPoolService.getPoolForDid.mock.calls.slice(0, 2).map((call) => call[1])
    expect(preResolveDids).toEqual(['did:indy:a', 'did:indy:b'])
  })

  it('logs a warning and continues when a single DID pre-resolve fails', async () => {
    const agent = makeAgent()
    mockPoolService.getPoolForDid
      .mockRejectedValueOnce(new Error('pool down')) // pre-resolve did:indy:a
      .mockResolvedValue({ pool: { submitRequest: jest.fn() } }) // everything else

    await warmCache(agent, credDefs, schemas, [], logger)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('did:indy:a'))
  })

  it('skips ledger refresh when cached ledgers are provided', async () => {
    const agent = makeAgent()
    mockPoolService.getPoolForDid.mockResolvedValue({ pool: { submitRequest: jest.fn() } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await warmCache(agent, credDefs, schemas, [{ id: 'cached' } as any], logger)

    expect(mockPoolService.refreshPoolConnections).not.toHaveBeenCalled()
  })

  it('refreshes ledger cache when no cached ledgers are provided', async () => {
    const agent = makeAgent()
    mockPoolService.getPoolForDid.mockResolvedValue({ pool: { submitRequest: jest.fn() } })
    mockPoolService.getAllPoolTransactions.mockResolvedValue([])

    await warmCache(agent, credDefs, schemas, undefined, logger)

    expect(mockPoolService.refreshPoolConnections).toHaveBeenCalled()
  })

  it('logs a warning and continues when a single credDef request fails', async () => {
    const agent = makeAgent()
    const submitRequest = jest
      .fn()
      .mockRejectedValueOnce(new Error('credDef 1 failed'))
      .mockResolvedValueOnce(undefined) // credDef 2
      .mockResolvedValue(undefined) // schemas
    mockPoolService.getPoolForDid.mockResolvedValue({ pool: { submitRequest } })

    await warmCache(agent, credDefs, schemas, [], logger)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cred-def-1'))
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('cred-def-2'))
  })

  it('logs a warning and continues when a single schema request fails', async () => {
    const agent = makeAgent()
    const submitRequest = jest
      .fn()
      .mockResolvedValueOnce(undefined) // credDef 1
      .mockResolvedValueOnce(undefined) // credDef 2
      .mockRejectedValueOnce(new Error('schema 1 failed'))
      .mockResolvedValueOnce(undefined) // schema 2
    mockPoolService.getPoolForDid.mockResolvedValue({ pool: { submitRequest } })

    await warmCache(agent, credDefs, schemas, [], logger)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('schema-1'))
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('schema-2'))
  })
})

describe('shutdownAgent', () => {
  it('calls agent.shutdown() when the agent is initialized', async () => {
    const agent = { isInitialized: true, shutdown: jest.fn().mockResolvedValue(undefined) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await shutdownAgent(agent as any, logger)

    expect(agent.shutdown).toHaveBeenCalled()
  })

  it('skips shutdown when the agent is not initialized (idempotent)', async () => {
    // A reset path already shut the agent down; the provider unmount then calls
    // shutdownAgent again. A second shutdown() would throw in askar onCloseContext.
    const agent = { isInitialized: false, shutdown: jest.fn().mockResolvedValue(undefined) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await shutdownAgent(agent as any, logger)

    expect(agent.shutdown).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('catches and logs errors without rethrowing', async () => {
    const agent = { isInitialized: true, shutdown: jest.fn().mockRejectedValue(new Error('shutdown boom')) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(shutdownAgent(agent as any, logger)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('shutdown boom'))
  })
})

describe('initializeAgent', () => {
  it('rethrows when initialize fails (so callers can surface init errors)', async () => {
    const agent = { initialize: jest.fn().mockRejectedValue(new Error('open failed')) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(initializeAgent(agent as any)).rejects.toThrow('open failed')
  })
})

describe('deleteWalletStore', () => {
  it('deletes the askar store', async () => {
    const deleteStore = jest.fn().mockResolvedValue(undefined)
    const agent = { modules: { askar: { deleteStore } } }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteWalletStore(agent as any)

    expect(deleteStore).toHaveBeenCalled()
  })

  it('rethrows when deleteStore fails so callers can decide how to handle it', async () => {
    const agent = { modules: { askar: { deleteStore: jest.fn().mockRejectedValue(new Error('delete boom')) } } }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deleteWalletStore(agent as any)).rejects.toThrow('delete boom')
  })
})

describe('purgeWalletStore', () => {
  const baseOptions = {
    ledgers: [],
    walletSecret,
    walletLabel: 'BC Wallet',
    enableProxy: false,
    mediatorUrl: 'https://mediator.example',
    logger,
  }

  it('builds a throwaway agent and deletes its store by config (no live agent needed)', async () => {
    const { Agent } = jest.requireMock('@credo-ts/core')

    await purgeWalletStore(baseOptions)

    expect(Agent).toHaveBeenCalled()
    const built = Agent.mock.results[Agent.mock.results.length - 1].value
    expect(built.modules.askar.deleteStore).toHaveBeenCalled()
  })

  it('rethrows when the underlying store delete fails so callers can log and continue', async () => {
    const { Agent } = jest.requireMock('@credo-ts/core')
    Agent.mockImplementationOnce(() => ({
      modules: { askar: { deleteStore: jest.fn().mockRejectedValue(new Error('purge boom')) } },
    }))

    await expect(purgeWalletStore(baseOptions)).rejects.toThrow('purge boom')
  })
})

describe('wallet lifecycle serialization', () => {
  it('holds a queued initialize until an in-flight shutdown finishes closing the wallet', async () => {
    // Models sign-out → sign-in: the old agent is still closing the shared Askar
    // wallet when the new agent tries to open it. The open must wait for the close.
    const order: string[] = []
    let resolveShutdown: () => void = () => undefined
    const shutdownGate = new Promise<void>((resolve) => {
      resolveShutdown = resolve
    })

    const oldAgent = {
      isInitialized: true,
      shutdown: jest.fn(() => shutdownGate.then(() => void order.push('shutdown'))),
    }
    const newAgent = {
      initialize: jest.fn(async () => void order.push('initialize')),
    }

    // Sign-out teardown begins (not awaited — fire-and-forget like the unmount path).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shutdownPromise = shutdownAgent(oldAgent as any, logger)
    // Sign-in build immediately tries to open the same wallet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initPromise = initializeAgent(newAgent as any)

    // Flush microtasks/timers: the open must still be queued behind the close.
    await new Promise((r) => setTimeout(r, 0))
    expect(newAgent.initialize).not.toHaveBeenCalled()

    // Close finishes → the queued open is now allowed to run.
    resolveShutdown()
    await shutdownPromise
    await initPromise

    expect(newAgent.initialize).toHaveBeenCalled()
    expect(order).toEqual(['shutdown', 'initialize'])
  })

  it('does not let a failed shutdown wedge the queue for the next open', async () => {
    const failing = { isInitialized: true, shutdown: jest.fn().mockRejectedValue(new Error('close boom')) }
    const next = { initialize: jest.fn().mockResolvedValue(undefined) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await shutdownAgent(failing as any, logger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await initializeAgent(next as any)

    expect(next.initialize).toHaveBeenCalled()
  })

  it('holds a queued store delete until an in-flight shutdown finishes closing the wallet', async () => {
    // Wallet/factory reset deletes the shared store while a previous agent may still
    // be closing it (e.g. the unmount-triggered shutdown). The delete must wait.
    const order: string[] = []
    let resolveShutdown: () => void = () => undefined
    const shutdownGate = new Promise<void>((resolve) => {
      resolveShutdown = resolve
    })

    const oldAgent = {
      isInitialized: true,
      shutdown: jest.fn(() => shutdownGate.then(() => void order.push('shutdown'))),
    }
    const agent = {
      modules: { askar: { deleteStore: jest.fn(async () => void order.push('delete')) } },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shutdownPromise = shutdownAgent(oldAgent as any, logger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deletePromise = deleteWalletStore(agent as any)

    await new Promise((r) => setTimeout(r, 0))
    expect(agent.modules.askar.deleteStore).not.toHaveBeenCalled()

    resolveShutdown()
    await shutdownPromise
    await deletePromise

    expect(order).toEqual(['shutdown', 'delete'])
  })
})
