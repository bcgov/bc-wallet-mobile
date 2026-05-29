import { CACHED_LEDGERS_TTL_DAYS } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { BCLocalStorageKeys } from '@/store'
import { getBCAgentModules } from '@/utils/bc-agent-modules'
import { BifoldLogger, PersistentStorage } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr'
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

/**
 * Serializes opening and closing of the single shared Askar wallet (WALLET_ID).
 *
 * The BCSC agent provider unmounts on sign-out and remounts on sign-in, building
 * a brand-new {@link Agent} each time against the same wallet file. React can
 * mount the next agent before the previous one has finished closing, so a fresh
 * agent's `initialize()` (wallet open) could race the prior agent's `shutdown()`
 * (wallet close) and leave the wallet/mediator session wedged — credential
 * issuance hangs and the mediator never reconnects until the app is restarted.
 *
 * Routing every open/close through this promise chain guarantees they run
 * strictly one after another, even across separate agent instances and React
 * mounts — a module-level lock survives component unmount; component refs do not.
 */
let walletLifecycle: Promise<unknown> = Promise.resolve()

const enqueueWalletOp = <T>(op: () => Promise<T>): Promise<T> => {
  // Chain onto the tail whether or not the previous op resolved, so a single
  // failed open/close can't wedge the queue for every later one.
  const result = walletLifecycle.then(op, op)
  walletLifecycle = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

/**
 * Loads previously cached pool genesis transactions from persistent storage.
 *
 * Used to skip live ledger discovery on subsequent agent inits. Returns `undefined`
 * if no cache exists or if the cache is older than `CACHED_LEDGERS_TTL_DAYS`,
 * signalling that callers should fall back to the configured ledgers and refresh
 * the cache.
 *
 * @returns Cached ledger configs if fresh, otherwise `undefined`.
 */
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

/**
 * Constructs a new Credo `Agent` configured for BCSC.
 *
 * Wires Indy ledgers, mediator endpoint, optional Indy VDR proxy, and the BC agent
 * module set. The returned agent is registered for outbound HTTP and WebSocket
 * transports but is not yet initialized — the caller must `await agent.initialize()`.
 *
 * @param opts - Agent build options including ledgers, wallet secret, mediator URL,
 *   wallet label, proxy settings, and a logger.
 * @throws {AppError} `AGENT_INITIALIZATION_ERROR` (2901) when `mediatorUrl` is empty.
 * @returns The configured (but uninitialized) `Agent` instance.
 */
export const buildAgent = (opts: BuildAgentOptions): Agent => {
  if (!opts.mediatorUrl) {
    throw AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR, {
      cause: new Error('Mediator URL is required to build agent'),
    })
  }

  const agentOptions = {
    label: opts.walletLabel,
    config: {
      walletConfig: { id: opts.walletSecret.id, key: opts.walletSecret.key },
      logger: opts.logger,
      mediatorPickupStrategy: DidCommMediatorPickupStrategy.Implicit,
      autoUpdateStorageOnStartup: true,
      autoAcceptConnections: true,
    },
    dependencies: agentDependencies,
    modules: getBCAgentModules({
      walletId: opts.walletSecret.id,
      walletKey: opts.walletSecret.key,
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

  return new Agent(agentOptions)
}

/**
 * Reopens the supplied agent's wallet and re-initializes it.
 *
 * Used when an agent instance is already held in memory (e.g. after a brief lock
 * or app foreground) but its wallet handle is closed. On any failure the error
 * is logged and `undefined` is returned so the caller can fall through to
 * building a fresh agent rather than crashing the init flow.
 *
 * @param agent - The existing agent whose wallet should be reopened.
 * @param walletSecret - Wallet `id` and `key` used to unlock the wallet.
 * @param logger - Logger used to record failures.
 * @returns The same `agent` once re-initialized, or `undefined` if reopen failed.
 */
export const restartAgent = async (agent: Agent, logger: BifoldLogger): Promise<Agent | undefined> => {
  try {
    await enqueueWalletOp(() => agent.initialize())
    return agent
  } catch (error) {
    logger.warn(`Agent restart failed: ${error}`)
    return undefined
  }
}

/**
 * Initializes a freshly built agent.
 *
 * The wallet open is serialized against any in-flight open/close (see
 * {@link enqueueWalletOp}) so a sign-in rebuild never races the previous agent's
 * teardown on the shared wallet file. Unlike {@link restartAgent} this rethrows
 * on failure so the caller can surface an init error.
 *
 * @param agent - The built (uninitialized) agent to initialize.
 */
export const initializeAgent = async (agent: Agent): Promise<void> => {
  await enqueueWalletOp(() => agent.initialize())
}

/**
 * Pre-fetches credential definitions and schemas from the Indy ledgers so that
 * subsequent credential offers render without per-attribute network round-trips.
 *
 * If `cachedLedgers` is undefined, the pool cache is refreshed first so the
 * agent has live genesis transactions to work with. Each cred-def and schema
 * fetch is run in parallel via `Promise.allSettled`; per-item failures are
 * logged as warnings and do not abort the warm-up — caching is purely additive
 * and must not block agent init.
 *
 * @param agent - An initialized agent used to resolve the Indy VDR pool service.
 * @param credDefs - Credential definitions to pre-fetch (`{ did, id }` per entry).
 * @param schemas - Schemas to pre-fetch (`{ did, id }` per entry).
 * @param cachedLedgers - Previously cached ledger configs, or `undefined` to refresh.
 * @param logger - Logger used to record per-item failures.
 */
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

  // Resolve each distinct issuer DID once, up front and sequentially, before firing
  // the parallel cred-def/schema reads below. Many cred-defs/schemas share an issuer
  // DID, so resolving them concurrently would send N simultaneous lookups for the same
  // DID to the ledgers (each missing the cold cache) instead of one. Pre-warming
  // serially populates the (in-memory) DID->pool cache so the reads below are cache
  // hits. Per-DID failures are non-fatal — warm-up is additive and must not block init.
  const uniqueDids = [...new Set([...credDefs, ...schemas].map(({ did }) => did))]
  for (const did of uniqueDids) {
    try {
      await poolService.getPoolForDid(agent.context, did)
    } catch (error) {
      logger.warn(`Warm cache: did ${did} pre-resolve failed: ${error}`)
    }
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

/**
 * Best-effort agent shutdown.
 *
 * Errors are logged but never thrown — shutdown failures must not block logout
 * or app teardown, and the wallet is closed in the underlying Askar handle even
 * if Credo's cleanup throws.
 *
 * @param agent - The agent to shut down.
 * @param logger - Logger used to record shutdown errors.
 */
export const shutdownAgent = async (agent: Agent, logger: BifoldLogger): Promise<void> => {
  try {
    await enqueueWalletOp(async () => {
      // Idempotent shutdown. A reset path (wallet reset / factory reset) may have
      // already shut this agent down before the provider unmounts and calls here
      // again on the same instance. Re-check inside the serialized op so we observe
      // any prior queued shutdown's result: a second agent.shutdown() runs askar's
      // onCloseContext against an already-closed store, which throws
      // ("There is no open store" → CredoError on the 'askar' module).
      if (!agent.isInitialized) {
        return
      }
      await agent.shutdown()
    })
  } catch (error) {
    logger.error(`Error shutting down agent: ${error}`)
  }
}

/**
 * Deletes the agent's Askar wallet store, serialized against any in-flight wallet
 * open/close (see {@link enqueueWalletOp}).
 *
 * Wallet reset and factory reset delete the store on the same shared wallet file that
 * a (re)mounting agent may be opening or closing. Routing the delete through the same
 * queue as `initialize`/`shutdown` guarantees it never runs concurrently with an open
 * handle, which otherwise surfaces as transaction/`onCloseContext` errors.
 *
 * Unlike {@link shutdownAgent} this does not swallow errors — callers decide whether a
 * failed delete is fatal (e.g. `resetWallet` clears state in a `finally`; recovery and
 * factory-reset paths log and continue).
 *
 * @param agent - The agent whose wallet store should be deleted.
 */
export const deleteWalletStore = async (agent: Agent): Promise<void> => {
  await enqueueWalletOp(() => agent.modules.askar.deleteStore())
}
