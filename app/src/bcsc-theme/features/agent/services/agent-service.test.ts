import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { PersistentStorage } from '@bifold/core'
import moment from 'moment'

jest.mock('@/store', () => ({
  BCLocalStorageKeys: { GenesisTransactions: 'GenesisTransactions' },
}))
jest.mock('@credo-ts/react-native', () => ({ agentDependencies: {} }))
jest.mock('@/utils/bc-agent-modules', () => ({ getBCAgentModules: jest.fn(() => ({})) }))
jest.mock('react-native-fs', () => ({ CachesDirectoryPath: '/tmp' }))

const mockRegisterOutboundTransport = jest.fn()
jest.mock('@credo-ts/core', () => {
  const actual = jest.requireActual('@credo-ts/core')
  return {
    ...actual,
    Agent: jest.fn().mockImplementation(() => ({
      registerOutboundTransport: mockRegisterOutboundTransport,
      wallet: { open: jest.fn() },
      initialize: jest.fn(),
      shutdown: jest.fn(),
    })),
    HttpOutboundTransport: jest.fn(),
    WsOutboundTransport: jest.fn(),
  }
})

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
jest.mock('@credo-ts/indy-vdr/build/pool', () => ({
  IndyVdrPoolService: jest.fn(),
}))

import {
  AgentWalletSecret,
  buildAgent,
  loadCachedLedgers,
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

  it('constructs an agent and registers both outbound transports', () => {
    const agent = buildAgent({ ...baseOptions, mediatorUrl: 'https://mediator.example' })

    expect(agent).toBeDefined()
    expect(mockRegisterOutboundTransport).toHaveBeenCalledTimes(2)
  })
})

describe('restartAgent', () => {
  const makeAgent = () =>
    ({
      wallet: { open: jest.fn() },
      initialize: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  it('returns the agent when wallet.open and initialize succeed', async () => {
    const agent = makeAgent()

    const result = await restartAgent(agent, walletSecret, logger)

    expect(result).toBe(agent)
    expect(agent.wallet.open).toHaveBeenCalledWith(walletSecret)
    expect(agent.initialize).toHaveBeenCalled()
  })

  it('returns undefined and logs a warning when wallet.open throws', async () => {
    const agent = makeAgent()
    agent.wallet.open.mockRejectedValue(new Error('cannot open'))

    const result = await restartAgent(agent, walletSecret, logger)

    expect(result).toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cannot open'))
  })

  it('returns undefined when initialize throws', async () => {
    const agent = makeAgent()
    agent.initialize.mockRejectedValue(new Error('init failed'))

    const result = await restartAgent(agent, walletSecret, logger)

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
  it('calls agent.shutdown()', async () => {
    const agent = { shutdown: jest.fn().mockResolvedValue(undefined) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await shutdownAgent(agent as any, logger)

    expect(agent.shutdown).toHaveBeenCalled()
  })

  it('catches and logs errors without rethrowing', async () => {
    const agent = { shutdown: jest.fn().mockRejectedValue(new Error('shutdown boom')) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(shutdownAgent(agent as any, logger)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('shutdown boom'))
  })
})
