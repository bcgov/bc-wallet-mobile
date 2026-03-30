import { BCLocalStorageKeys, BCState } from '@/store'
import { activate } from '@/utils/PushNotificationsHelper'
import { getBCAgentModules } from '@/utils/bc-agent-modules'
import {
  createLinkSecretIfRequired,
  DispatchAction,
  migrateToAskar,
  PersistentStorage,
  TOKENS,
  useServices,
  useStore,
  WalletSecret,
} from '@bifold/core'
import {
  Agent,
  ConnectionEventTypes,
  ConnectionRecord,
  ConnectionRepository,
  ConnectionStateChangedEvent,
  ConnectionType,
  DidExchangeState,
  HttpOutboundTransport,
  KeylistUpdateAction,
  MediationRepository,
  MediatorPickupStrategy,
  OutOfBandRepository,
  WsOutboundTransport,
} from '@credo-ts/core'
import { IndyVdrPoolConfig, IndyVdrPoolService } from '@credo-ts/indy-vdr/build/pool'
import { agentDependencies } from '@credo-ts/react-native'
import { GetCredentialDefinitionRequest, GetSchemaRequest } from '@hyperledger/indy-vdr-shared'
import moment from 'moment'
import { useCallback, useRef, useState } from 'react'
import { Config } from 'react-native-config'
import { CachesDirectoryPath } from 'react-native-fs'

const DEFAULT_MEDIATION_EXPIRED_THRESHOLD_DAYS = '90'
const CONNECTION_COMPLETION_TIMEOUT_MS = 10000

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
  const agentInstanceRef = useRef<Agent | null>(null)
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

  const restartExistingAgent = useCallback(
    async (agent: Agent, walletSecret: WalletSecret): Promise<Agent | undefined> => {
      try {
        await agent.wallet.open({
          id: walletSecret.id,
          key: walletSecret.key,
        })
        await agent.initialize()
      } catch (error) {
        logger.warn(`Agent restart failed with error ${error}`)
        // if the existing agents wallet cannot be opened or initialize() fails it was
        // again not a clean shutdown and the agent should be replaced, not restarted
        return
      }

      return agent
    },
    [logger]
  )

  const createNewAgent = useCallback(
    async (ledgers: IndyVdrPoolConfig[], walletSecret: WalletSecret, mediatorUrl: string): Promise<Agent> => {
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
          mediatorInvitationUrl: mediatorUrl,
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

  const waitForConnectionCompleted = async (agent: Agent, connection: ConnectionRecord) => {
    if (connection.state === DidExchangeState.Completed) {
      return connection
    }

    return new Promise<ConnectionRecord>((resolve, reject) => {
      const listener = (event: ConnectionStateChangedEvent) => {
        const { connectionRecord } = event.payload

        if (
          connectionRecord.id === connection.id &&
          connectionRecord.state === DidExchangeState.Completed &&
          connectionRecord.isReady
        ) {
          cleanup()
          resolve(connectionRecord)
        }
      }

      const cleanup = () => {
        agent.events.off(ConnectionEventTypes.ConnectionStateChanged, listener)
        clearTimeout(timeoutId)
      }

      agent.events.on(ConnectionEventTypes.ConnectionStateChanged, listener)

      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error(`Timed out waiting for connection ${connection.id} to complete`))
      }, CONNECTION_COMPLETION_TIMEOUT_MS)
    })
  }

  const updateLastSeen = useCallback(async (agent: Agent) => {
    const connectionRepository = agent.dependencyManager.resolve(ConnectionRepository)

    const connectionRecords = await connectionRepository.getAll(agent.context)
    const defaultMediatorConnection = connectionRecords.find((record) =>
      record.connectionTypes?.includes(ConnectionType.Mediator)
    )
    defaultMediatorConnection?.setTag('lastSeen', new Date().toISOString())
    if (defaultMediatorConnection) {
      await connectionRepository.update(agent.context, defaultMediatorConnection)
    }
  }, [])

  const recoverMediationIfExpired = useCallback(
    async (agent: Agent, mediatorUrl: string) => {
      logger.info('Resetting mediation state and creating a new connection...')

      try {
        await agent.mediationRecipient.stopMessagePickup()
      } catch (e) {
        logger.warn(`No active message pickup to stop: ${e}`)
      }

      const mediationRepository = agent.dependencyManager.resolve(MediationRepository)
      const connectionRepository = agent.dependencyManager.resolve(ConnectionRepository)
      const outOfBandRepository = agent.dependencyManager.resolve(OutOfBandRepository)

      const oldMediationRecord = await agent.mediationRecipient.findDefaultMediator()
      if (!oldMediationRecord) {
        logger.warn('No mediation record found to delete')
        return
      }

      const mediationConnectionRecord = await connectionRepository.getById(
        agent.context,
        oldMediationRecord.connectionId
      )
      if (!mediationConnectionRecord) {
        logger.warn('No connection record found for mediation record')
        return
      }

      let lastSeen = mediationConnectionRecord.getTag('lastSeen')?.toString()

      if (!lastSeen) {
        lastSeen = mediationConnectionRecord.updatedAt?.toISOString()
      }

      const daysSinceLastSeen = moment().diff(moment(lastSeen), 'days')
      const mediationExpiredThresholdConfig =
        Config.MEDIATION_EXPIRED_THRESHOLD_DAYS || DEFAULT_MEDIATION_EXPIRED_THRESHOLD_DAYS
      let mediationExpiredThresholdDays = Number.parseInt(mediationExpiredThresholdConfig, 10)
      if (Number.isNaN(mediationExpiredThresholdDays)) {
        logger.warn(
          `Invalid mediation expired threshold config value: ${mediationExpiredThresholdConfig}. Falling back to default of ${DEFAULT_MEDIATION_EXPIRED_THRESHOLD_DAYS} days.`
        )
        mediationExpiredThresholdDays = Number.parseInt(DEFAULT_MEDIATION_EXPIRED_THRESHOLD_DAYS, 10)
      }

      if (daysSinceLastSeen < mediationExpiredThresholdDays) {
        logger.info(
          `Mediation connection last seen ${daysSinceLastSeen} days ago, which is below the expiration threshold. No need to reset mediation.`
        )
        return
      }
      logger.info(
        `Mediation connection last seen ${daysSinceLastSeen} days ago, which is above the expiration threshold. Proceeding with mediation reset.`
      )

      // Delete all of the default mediation records.
      logger.info(`Deleting mediation record ${oldMediationRecord.id}...`)
      await mediationRepository.delete(agent.context, oldMediationRecord)
      const oldMediatorConnectionRecord = await connectionRepository.getById(
        agent.context,
        oldMediationRecord.connectionId
      )
      logger.info(`Deleting mediator connection record ${oldMediatorConnectionRecord.id}...`)
      await connectionRepository.delete(agent.context, oldMediatorConnectionRecord)
      let oldOobRecord = undefined
      if (oldMediatorConnectionRecord.outOfBandId) {
        logger.info(`Deleting out-of-band record ${oldMediatorConnectionRecord.outOfBandId}...`)
        oldOobRecord = await outOfBandRepository.getById(agent.context, oldMediatorConnectionRecord.outOfBandId)
        await outOfBandRepository.delete(agent.context, oldOobRecord)
      }

      let newConnectionEstablished = false
      try {
        logger.info('Mediation state cleared. Creating new mediation connection...')

        const { connectionRecord } = await agent.oob.receiveInvitationFromUrl(mediatorUrl, {
          reuseConnection: false,
          autoAcceptConnection: true,
          autoAcceptInvitation: true,
        })
        newConnectionEstablished = true

        logger.info(`New connection created ${connectionRecord?.id}. Waiting for completion...`)

        if (!connectionRecord) {
          throw new Error('Failed to establish mediation connection: no connection record returned from invitation')
        }

        await waitForConnectionCompleted(agent, connectionRecord)
        const freshConnection = await connectionRepository.getById(agent.context, connectionRecord.id)

        // Ping ensures the session is created on the mediator side for the new connection.
        await agent.connections.sendPing(freshConnection.id, { responseRequested: true })

        // Request mediation grant for the new connection and register the existing recipient keys.
        const newMediationRecord = await agent.mediationRecipient.requestAndAwaitGrant(freshConnection)
        for (const key of oldMediationRecord.recipientKeys) {
          logger.debug(`Adding key to key list: ${key}`)
          await agent.mediationRecipient.notifyKeylistUpdate(freshConnection, key, KeylistUpdateAction.add)
        }

        await agent.mediationRecipient.setDefaultMediator(newMediationRecord)
        await agent.mediationRecipient.initiateMessagePickup(
          newMediationRecord,
          MediatorPickupStrategy.PickUpV2LiveMode
        )
      } catch (error) {
        logger.error(`Error during mediation recovery. Attempting recovery of the deleted mediation records: ${error}`)
        await mediationRepository.save(agent.context, oldMediationRecord)
        await connectionRepository.save(agent.context, oldMediatorConnectionRecord)
        if (oldOobRecord && !newConnectionEstablished) {
          await outOfBandRepository.save(agent.context, oldOobRecord)
        }
        throw error
      }

      logger.info('Mediation re-established successfully')
    },
    [logger]
  )

  const initializeAgent = useCallback(
    async (walletSecret: WalletSecret): Promise<void> => {
      const mediatorUrl = store.preferences.selectedMediator
      logger.info('Checking for existing agent...')
      if (agentInstanceRef.current) {
        const restartedAgent = await restartExistingAgent(agentInstanceRef.current, walletSecret)
        if (restartedAgent) {
          logger.info('Successfully restarted existing agent...')
          restartedAgent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
          refreshAttestationMonitor(restartedAgent)
          agentInstanceRef.current = restartedAgent
          setAgent(restartedAgent)
          return
        }
      }

      logger.info('Checking for cached ledgers...')
      const cachedLedgers = await loadCachedLedgers()
      const ledgers = cachedLedgers ?? indyLedgers

      logger.info('Creating new agent...')
      const newAgent = await createNewAgent(ledgers, walletSecret, mediatorUrl)

      logger.info('Migrating agent if required...')
      await migrateIfRequired(newAgent, walletSecret)

      logger.info('Initializing agent...')
      await newAgent.initialize()

      try {
        await newAgent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
      } catch (error) {
        logger.error(`Error initiating message pickup: ${error}`)
        await recoverMediationIfExpired(newAgent, mediatorUrl)
      }

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

      logger.info('Tag mediation connection with last seen time')
      updateLastSeen(newAgent).catch((e) =>
        logger.error(`Failed to update last seen tag on mediation connection: ${e}`)
      )

      logger.info('Setting new agent...')
      agentInstanceRef.current = newAgent
      setAgent(newAgent)
    },
    [
      store.preferences.selectedMediator,
      store.preferences.usePushNotifications,
      logger,
      indyLedgers,
      createNewAgent,
      migrateIfRequired,
      warmUpCache,
      refreshAttestationMonitor,
      restartExistingAgent,
      updateLastSeen,
      recoverMediationIfExpired,
    ]
  )

  const shutdownAndClearAgentIfExists = useCallback(async () => {
    if (agent) {
      try {
        await agent.shutdown()
      } catch (error) {
        logger.error(`Error shutting down agent with shutdownAndClearAgentIfExists: ${error}`)
      } finally {
        setAgent(null)
      }
    }
  }, [agent, logger])

  return { agent, initializeAgent, shutdownAndClearAgentIfExists }
}

export default useBCAgentSetup
