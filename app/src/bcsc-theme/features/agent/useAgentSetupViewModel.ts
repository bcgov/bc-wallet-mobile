import { WALLET_ID } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { BCState } from '@/store'
import { activate } from '@/utils/PushNotificationsHelper'
import { createLinkSecretIfRequired, TOKENS, useServices, useStore } from '@bifold/core'
import { Agent, MediatorPickupStrategy } from '@credo-ts/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Config } from 'react-native-config'

import { buildAgent, loadCachedLedgers, restartAgent, shutdownAgent, warmCache } from './services/agent-service'

export type AgentSetupStatus = 'idle' | 'initializing' | 'ready' | 'error'

export interface AgentSetupResult {
  agent: Agent | null
  status: AgentSetupStatus
  error: AppError | null
  retry: () => void
}

const useAgentSetupViewModel = (): AgentSetupResult => {
  const [store] = useStore<BCState>()
  const [logger, indyLedgers, attestationMonitor, credDefs, schemas] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.UTIL_LEDGERS,
    TOKENS.UTIL_ATTESTATION_MONITOR,
    TOKENS.CACHE_CRED_DEFS,
    TOKENS.CACHE_SCHEMAS,
  ])

  const [status, setStatus] = useState<AgentSetupStatus>('idle')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const agentRef = useRef<Agent | null>(null)
  const initializingRef = useRef(false)

  const didAuthenticate = store.authentication.didAuthenticate
  const walletKey = store.bcscSecure.walletKey
  const mediatorUrl = store.preferences.selectedMediator
  const walletLabel = store.preferences.walletName || 'BC Wallet'
  const enableProxy = store.developer.enableProxy
  const usePushNotifications = store.preferences.usePushNotifications

  const refreshAttestationMonitor = useCallback(
    (liveAgent: Agent) => {
      attestationMonitor?.stop()
      attestationMonitor?.start(liveAgent)
    },
    [attestationMonitor]
  )

  const retry = useCallback(() => {
    setError(null)
    setStatus('idle')
    setRetryCount((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!didAuthenticate) {
      if (agentRef.current) {
        shutdownAgent(agentRef.current, logger)
        agentRef.current = null
        setAgent(null)
      }
      setStatus('idle')
      setError(null)
      initializingRef.current = false
      return
    }

    if (initializingRef.current || status === 'ready' || status === 'error') {
      return
    }

    initializingRef.current = true
    setStatus('initializing')
    setError(null)

    const run = async (): Promise<void> => {
      try {
        if (!walletKey) {
          throw AppError.fromErrorDefinition(ErrorRegistry.WALLET_SECRET_NOT_FOUND)
        }

        const walletSecret = { id: WALLET_ID, key: walletKey }

        if (agentRef.current) {
          const restarted = await restartAgent(agentRef.current, walletSecret, logger)
          if (restarted) {
            await restarted.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
            refreshAttestationMonitor(restarted)
            agentRef.current = restarted
            setAgent(restarted)
            setStatus('ready')
            return
          }
        }

        const cachedLedgers = await loadCachedLedgers()
        const ledgers = cachedLedgers ?? indyLedgers

        const newAgent = buildAgent({
          ledgers,
          walletSecret,
          mediatorUrl,
          walletLabel,
          enableProxy,
          proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
          logger,
        })

        await newAgent.initialize()
        await newAgent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
        await warmCache(newAgent, credDefs, schemas, cachedLedgers, logger)
        await createLinkSecretIfRequired(newAgent)

        if (usePushNotifications) {
          activate(newAgent).catch((err) => logger.warn(`Push notification activation failed: ${err}`))
        }

        refreshAttestationMonitor(newAgent)

        agentRef.current = newAgent
        setAgent(newAgent)
        setStatus('ready')
      } catch (err) {
        const appError =
          err instanceof AppError
            ? err
            : AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR, { cause: err })
        logger.error(`[${appError.appEvent}] Agent init failed: ${appError.message}`)
        setError(appError)
        setStatus('error')
      } finally {
        initializingRef.current = false
      }
    }

    run()
  }, [
    didAuthenticate,
    walletKey,
    mediatorUrl,
    walletLabel,
    enableProxy,
    usePushNotifications,
    retryCount,
    status,
    logger,
    indyLedgers,
    credDefs,
    schemas,
    refreshAttestationMonitor,
  ])

  return { agent, status, error, retry }
}

export default useAgentSetupViewModel
