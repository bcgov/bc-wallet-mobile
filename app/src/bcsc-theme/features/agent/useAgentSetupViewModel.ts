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
  const statusRef = useRef<AgentSetupStatus>('idle')
  statusRef.current = status

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

    if (initializingRef.current || statusRef.current === 'ready' || statusRef.current === 'error') {
      return
    }

    initializingRef.current = true
    setStatus('initializing')
    setError(null)

    let cancelled = false
    let inFlightAgent: Agent | undefined

    const run = async (): Promise<void> => {
      try {
        if (!walletKey) {
          throw AppError.fromErrorDefinition(ErrorRegistry.WALLET_SECRET_NOT_FOUND)
        }

        const walletSecret = { id: WALLET_ID, key: walletKey }

        if (agentRef.current) {
          const restarted = await restartAgent(agentRef.current, walletSecret, logger)
          if (cancelled) {
            return
          }
          if (restarted) {
            await restarted.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
            if (cancelled) {
              return
            }
            refreshAttestationMonitor(restarted)
            agentRef.current = restarted
            setAgent(restarted)
            setStatus('ready')
            return
          }
          // Restart failed — old agent may still hold open transports/listeners.
          // Best-effort shut it down before falling through to build a fresh one.
          await shutdownAgent(agentRef.current, logger)
          agentRef.current = null
        }

        const cachedLedgers = await loadCachedLedgers()
        if (cancelled) {
          return
        }
        const ledgers = cachedLedgers ?? indyLedgers

        inFlightAgent = buildAgent({
          ledgers,
          walletSecret,
          mediatorUrl,
          walletLabel,
          enableProxy,
          proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
          logger,
        })

        await inFlightAgent.initialize()
        if (cancelled) {
          return
        }
        await inFlightAgent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.PickUpV2LiveMode)
        if (cancelled) {
          return
        }
        await warmCache(inFlightAgent, credDefs, schemas, cachedLedgers, logger)
        if (cancelled) {
          return
        }
        await createLinkSecretIfRequired(inFlightAgent)
        if (cancelled) {
          return
        }

        if (usePushNotifications) {
          activate(inFlightAgent).catch((err) => logger.warn(`Push notification activation failed: ${err}`))
        }

        refreshAttestationMonitor(inFlightAgent)

        agentRef.current = inFlightAgent
        setAgent(inFlightAgent)
        setStatus('ready')
        inFlightAgent = undefined
      } catch (err) {
        if (cancelled) {
          return
        }
        const appError =
          err instanceof AppError
            ? err
            : AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR, { cause: err })
        logger.error(`[${appError.appEvent}] Agent init failed: ${appError.message}`)
        // Clear any stale agent so retry takes the fresh build path instead of
        // re-attempting restart on a broken instance.
        if (agentRef.current) {
          await shutdownAgent(agentRef.current, logger)
          agentRef.current = null
          setAgent(null)
        }
        setError(appError)
        setStatus('error')
      } finally {
        if (inFlightAgent) {
          await shutdownAgent(inFlightAgent, logger)
        }
        if (!cancelled) {
          initializingRef.current = false
        }
      }
    }

    run()

    return () => {
      cancelled = true
      initializingRef.current = false
    }
  }, [
    didAuthenticate,
    walletKey,
    mediatorUrl,
    walletLabel,
    enableProxy,
    usePushNotifications,
    retryCount,
    logger,
    indyLedgers,
    credDefs,
    schemas,
    refreshAttestationMonitor,
  ])

  return { agent, status, error, retry }
}

export default useAgentSetupViewModel
