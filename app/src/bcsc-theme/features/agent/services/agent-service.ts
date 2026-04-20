import { CACHED_LEDGERS_TTL_DAYS } from '@/constants'
import { BCLocalStorageKeys } from '@/store'
import { getBCAgentModules } from '@/utils/bc-agent-modules'
import { BifoldLogger, PersistentStorage } from '@bifold/core'
import { Agent, HttpOutboundTransport, MediatorPickupStrategy, WsOutboundTransport } from '@credo-ts/core'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { agentDependencies } from '@credo-ts/react-native'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import moment from 'moment'
import { CachesDirectoryPath } from 'react-native-fs'

export interface AgentWalletSecret {
  id: string
  key: string
}

export interface CachedItemId {
  did: string
  id: string
}

export interface BuildAgentOptions {
  ledgers: IndyVdrPoolConfig[]
  walletSecret: AgentWalletSecret
  mediatorUrl: string
  walletLabel: string
  enableProxy: boolean
  proxyBaseUrl?: string
  logger: BifoldLogger
}

interface CachedGenesisTransactions {
  timestamp: string
  transactions: IndyVdrPoolConfig[]
}

export const loadCachedLedgers = async (): Promise<IndyVdrPoolConfig[] | undefined> => {
  const cached = await PersistentStorage.fetchValueForKey<CachedGenesisTransactions>(
    BCLocalStorageKeys.GenesisTransactions
  )
  if (!cached) {
    return undefined
  }
  const isFresh = moment().diff(moment(cached.timestamp), 'days') < CACHED_LEDGERS_TTL_DAYS
  return isFresh ? cached.transactions : undefined
}

export const buildAgent = (opts: BuildAgentOptions): Agent => {
  if (!opts.mediatorUrl) {
    throw new Error('Mediator URL is required to build agent')
  }

  const agentOptions = {
    config: {
      label: opts.walletLabel,
      walletConfig: { id: opts.walletSecret.id, key: opts.walletSecret.key },
      logger: opts.logger,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
      autoUpdateStorageOnStartup: true,
      autoAcceptConnections: true,
    },
    dependencies: agentDependencies,
    modules: getBCAgentModules({
      indyNetworks: opts.ledgers,
      mediatorInvitationUrl: opts.mediatorUrl,
      txnCache: {
        capacity: 1000,
        expiryOffsetMs: 1000 * 60 * 60 * 24 * 7,
        path: CachesDirectoryPath + '/txn-cache',
      },
      enableProxy: opts.enableProxy,
      proxyBaseUrl: opts.proxyBaseUrl,
      proxyCacheSettings: {
        allowCaching: false,
        cacheDurationInSeconds: 60 * 60 * 24 * 7,
      },
    }),
  }

  const agent = new Agent(agentOptions)
  agent.registerOutboundTransport(new WsOutboundTransport())
  agent.registerOutboundTransport(new HttpOutboundTransport())

  return agent
}

export const restartAgent = async (
  agent: Agent,
  walletSecret: AgentWalletSecret,
  logger: BifoldLogger
): Promise<Agent | undefined> => {
  try {
    await agent.wallet.open({ id: walletSecret.id, key: walletSecret.key })
    await agent.initialize()
    return agent
  } catch (error) {
    logger.warn(`Agent restart failed: ${error}`)
    return undefined
  }
}

export const warmCache = async (
  agent: Agent,
  credDefs: CachedItemId[],
  schemas: CachedItemId[],
  cachedLedgers: IndyVdrPoolConfig[] | undefined,
  logger: BifoldLogger
): Promise<void> => {
  const poolService = agent.dependencyManager.resolve(IndyVdrPoolService)

  if (!cachedLedgers) {
    await refreshLedgerCache(poolService, logger)
  }

  const credDefResults = await Promise.allSettled(
    credDefs.map(async ({ did, id }) => {
      const pool = await poolService.getPoolForDid(agent.context, did)
      await pool.pool.submitRequest(new GetCredentialDefinitionRequest({ credentialDefinitionId: id }))
    })
  )
  credDefResults.forEach((result, idx) => {
    if (result.status === 'rejected') {
      logger.warn(`Warm cache: credDef ${credDefs[idx].id} failed: ${result.reason}`)
    }
  })

  const schemaResults = await Promise.allSettled(
    schemas.map(async ({ did, id }) => {
      const pool = await poolService.getPoolForDid(agent.context, did)
      await pool.pool.submitRequest(new GetSchemaRequest({ schemaId: id }))
    })
  )
  schemaResults.forEach((result, idx) => {
    if (result.status === 'rejected') {
      logger.warn(`Warm cache: schema ${schemas[idx].id} failed: ${result.reason}`)
    }
  })
}

const refreshLedgerCache = async (poolService: IndyVdrPoolService, logger: BifoldLogger): Promise<void> => {
  try {
    // these escapes can be removed once Indy VDR has been upgraded and the patch is no longer needed
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    await poolService.refreshPoolConnections()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore:next-line
    const rawTransactions = await poolService.getAllPoolTransactions()
    const transactions = rawTransactions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.value)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(({ config, transactions }: any) => ({
        ...config,
        genesisTransactions: transactions.reduce((prev: string, curr: unknown) => prev + JSON.stringify(curr), ''),
      }))

    if (transactions.length > 0) {
      await PersistentStorage.storeValueForKey<CachedGenesisTransactions>(BCLocalStorageKeys.GenesisTransactions, {
        timestamp: moment().toISOString(),
        transactions,
      })
    }
  } catch (error) {
    logger.warn(`Warm cache: refreshing ledger cache failed: ${error}`)
  }
}

export const shutdownAgent = async (agent: Agent, logger: BifoldLogger): Promise<void> => {
  try {
    await agent.shutdown()
  } catch (error) {
    logger.error(`Error shutting down agent: ${error}`)
  }
}
