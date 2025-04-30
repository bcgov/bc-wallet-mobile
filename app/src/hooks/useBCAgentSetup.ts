import { Agent, HttpOutboundTransport, MediatorPickupStrategy, WsOutboundTransport } from '@credo-ts/core'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { agentDependencies } from '@credo-ts/react-native'
import {
  DispatchAction,
  useStore,
  migrateToAskar,
  createLinkSecretIfRequired,
  TOKENS,
  useServices,
  PersistentStorage,
  WalletSecret,
} from '@bifold/core'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import moment from 'moment'
import { useCallback, useState } from 'react'
import { Config } from 'react-native-config'
import { CachesDirectoryPath } from 'react-native-fs'
import { activate } from '@/utils/PushNotificationsHelper'
import { getBCAgentModules } from '@/utils/bc-agent-modules'
import { BCState, BCLocalStorageKeys } from '../store'

const loadCachedLedgers = async (): Promise<IndyVdrPoolConfig[] | undefined> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedTransactions = await PersistentStorage.fetchValueForKey<any>(BCLocalStorageKeys.GenesisTransactions)
  if (cachedTransactions) {
    const { timestamp, transactions } = cachedTransactions
    return moment().diff(moment(timestamp), 'days') >= 1 ? undefined : transactions
  }
}

const useBCAgentSetup = () => {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [store, dispatch] = useStore<BCState>()
  const [logger, indyLedgers, attestationMonitor, credDefs, schemas] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.UTIL_LEDGERS,
    TOKENS.UTIL_ATTESTATION_MONITOR,
    TOKENS.CACHE_CRED_DEFS,
    TOKENS.CACHE_SCHEMAS,
  ])

  const refreshAttestationMonitor = useCallback(
    (agent: Agent) => {
      attestationMonitor?.stop()
      attestationMonitor?.start(agent)
    },
    [attestationMonitor]
  )

  const createNewAgent = useCallback(
    async (ledgers: IndyVdrPoolConfig[], walletSecret: WalletSecret): Promise<Agent> => {
      const options = {
        config: {
          label: store.preferences.walletName || 'BC Wallet',
          walletConfig: {
            id: walletSecret.id,
            key: walletSecret.key,
          },
          logger,
          mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
          autoUpdateStorageOnStartup: true,
          autoAcceptConnections: true,
        },
        dependencies: agentDependencies,
        modules: getBCAgentModules({
          indyNetworks: ledgers,
          mediatorInvitationUrl: Config.MEDIATOR_URL,
          txnCache: {
            capacity: 1000,
            expiryOffsetMs: 1000 * 60 * 60 * 24 * 7,
            path: CachesDirectoryPath + '/txn-cache',
          },
          enableProxy: store.developer.enableProxy,
          proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
          proxyCacheSettings: {
            allowCaching: false,
            cacheDurationInSeconds: 60 * 60 * 24 * 7,
          },
        }),
      }

      logger.info(store.developer.enableProxy && Config.INDY_VDR_PROXY_URL ? 'VDR Proxy enabled' : 'VDR Proxy disabled')

      const newAgent = new Agent(options)
      const wsTransport = new WsOutboundTransport()
      const httpTransport = new HttpOutboundTransport()

      newAgent.registerOutboundTransport(wsTransport)
      newAgent.registerOutboundTransport(httpTransport)

      return newAgent
    },
    [store.preferences.walletName, logger, store.developer.enableProxy]
  )

  const migrateIfRequired = useCallback(
    async (newAgent: Agent, walletSecret: WalletSecret) => {
      // If we haven't migrated to Aries Askar yet, we need to do this before we initialize the agent.
      if (!store.migration.didMigrateToAskar) {
        await migrateToAskar(walletSecret.id, walletSecret.key, newAgent)
        dispatch({
          type: DispatchAction.DID_MIGRATE_TO_ASKAR,
        })
      }
    },
    [store.migration.didMigrateToAskar, dispatch]
  )

  const warmUpCache = useCallback(
    async (newAgent: Agent, cachedLedgers?: IndyVdrPoolConfig[]) => {
      const poolService = newAgent.dependencyManager.resolve(IndyVdrPoolService)
      if (!cachedLedgers) {
        // these escapes can be removed once Indy VDR has been upgraded and the patch is no longer needed
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore:next-line
        await poolService.refreshPoolConnections()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore:next-line
        const raw_transactions = await poolService.getAllPoolTransactions()
        const transactions = raw_transactions
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore:next-line
          .map((item) => item.value)
          .map(({ config, transactions }) => ({
            ...config,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore:next-line
            genesisTransactions: transactions.reduce((prev, curr) => {
              return prev + JSON.stringify(curr)
            }, ''),
          }))
        if (transactions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await PersistentStorage.storeValueForKey<any>(BCLocalStorageKeys.GenesisTransactions, {
            timestamp: moment().toISOString(),
            transactions,
          })
        }
      }

      credDefs.forEach(async ({ did, id }) => {
        const pool = await poolService.getPoolForDid(newAgent.context, did)
        const credDefRequest = new GetCredentialDefinitionRequest({ credentialDefinitionId: id })
        await pool.pool.submitRequest(credDefRequest)
      })

      schemas.forEach(async ({ did, id }) => {
        const pool = await poolService.getPoolForDid(newAgent.context, did)
        const schemaRequest = new GetSchemaRequest({ schemaId: id })
        await pool.pool.submitRequest(schemaRequest)
      })
    },
    [credDefs, schemas]
  )

  const initializeAgent = useCallback(
    async (walletSecret: WalletSecret): Promise<void> => {
      logger.info('Checking for cached ledgers...')
      const cachedLedgers = await loadCachedLedgers()
      const ledgers = cachedLedgers ?? indyLedgers

      logger.info('Creating new agent...')
      const newAgent = await createNewAgent(ledgers, walletSecret)

      logger.info('Migrating agent if required...')
      await migrateIfRequired(newAgent, walletSecret)

      logger.info('Initializing agent...')
      await newAgent.initialize()

      logger.info('Warming up cache...')
      await warmUpCache(newAgent, cachedLedgers)

      logger.info('Creating link secret if required...')
      await createLinkSecretIfRequired(newAgent)

      if (store.preferences.usePushNotifications) {
        logger.info('Activating push notifications...')
        activate(newAgent)
      }

      // In case the old attestationMonitor is still active, stop it and start a new one
      logger.info('Starting attestation monitor...')
      refreshAttestationMonitor(newAgent)

      logger.info('Setting new agent...')
      setAgent(newAgent)
    },
    [
      setAgent,
      indyLedgers,
      createNewAgent,
      logger,
      migrateIfRequired,
      warmUpCache,
      store.preferences.usePushNotifications,
      refreshAttestationMonitor,
    ]
  )

  const eraseAgent = useCallback(async () => {
    if (agent) {
      try {
        await agent.shutdown()
      } catch (error) {
        logger.error(`Error shutting down agent with eraseAgent: ${error}`)
      }
    } else {
      logger.warn('No agent to erase')
    }

    setAgent(null)
  }, [agent, logger])

  return { agent, initializeAgent, eraseAgent }
}

export default useBCAgentSetup
