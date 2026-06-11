import { ledgerResolver } from '@/configs/ledgers/indy/ledgerResolver'
import { WALLET_ID } from '@/constants'
import { AppError, ErrorRegistry } from '@/errors'
import { BCState } from '@/store'
import { activate, deactivate } from '@/utils/PushNotificationsHelper'
import { createLinkSecretIfRequired, TOKENS, useServices, useStore } from '@bifold/core'
import { RemoteOCABundleResolver } from '@bifold/oca/build/legacy'
import { Agent } from '@credo-ts/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Config } from 'react-native-config'

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
} from './services/agent-service'

export type AgentSetupStatus = 'idle' | 'initializing' | 'ready' | 'error'

export interface AgentSetupResult {
  agent: Agent | null
  status: AgentSetupStatus
  error: AppError | null
  retry: () => void
  resetWallet: () => Promise<void>
}

const useAgentSetupViewModel = (): AgentSetupResult => {
  const [store] = useStore<BCState>()
  const [logger, attestationMonitor, credDefs, schemas, ocaBundleResolver] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.UTIL_ATTESTATION_MONITOR,
    TOKENS.CACHE_CRED_DEFS,
    TOKENS.CACHE_SCHEMAS,
    TOKENS.UTIL_OCA_RESOLVER,
  ])

  const [status, setStatus] = useState<AgentSetupStatus>('idle')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const agentRef = useRef<Agent | null>(null)
  const initializingRef = useRef(false)
  const resettingRef = useRef(false)
  const statusRef = useRef<AgentSetupStatus>('idle')
  statusRef.current = status
  const loggerRef = useRef(logger)
  loggerRef.current = logger

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

  // Sign-out removes the authenticated navigator subtree, unmounting this
  // provider. Tear the agent down here so it doesn't linger as a zombie holding
  // the Askar wallet open and its mediator live-session socket alive — otherwise
  // the next sign-in builds a second agent that the mediator and wallet fight
  // over, which is why issuance hangs until the app is force-restarted. The
  // wallet close is serialized in agent-service, so the next sign-in's build
  // waits for it before reopening. Empty deps: cleanup runs only on unmount.
  useEffect(() => {
    return () => {
      const liveAgent = agentRef.current
      if (liveAgent) {
        agentRef.current = null
        shutdownAgent(liveAgent, loggerRef.current)
      }
    }
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

    // Reuse the in-memory agent if it can be reopened. Returns 'ready' when reused,
    // 'rebuild' to fall through to a fresh build, or 'cancelled' if torn down mid-way.
    const attemptRestart = async (existing: Agent): Promise<'ready' | 'rebuild' | 'cancelled'> => {
      const restarted = await restartAgent(existing, logger)
      if (cancelled) {
        return 'cancelled'
      }
      if (!restarted) {
        // Restart failed — old agent may still hold open transports/listeners.
        // Best-effort shut it down before falling through to build a fresh one.
        await shutdownAgent(existing, logger)
        agentRef.current = null
        // Setting agent to null causes BifoldScope to drop AgentProvider, which
        // remounts child components and clears stale hook state (e.g. useCredentials)
        // before the fresh agent is provided.
        setAgent(null)
        return 'rebuild'
      }
      await restarted.didcomm.mediationRecipient.initiateMessagePickup(
        undefined,
        DidCommMediatorPickupStrategy.PickUpV2LiveMode
      )
      if (cancelled) {
        return 'cancelled'
      }
      refreshAttestationMonitor(restarted)
      agentRef.current = restarted
      setAgent(restarted)
      setStatus('ready')
      return 'ready'
    }

    // Build, initialize, and wire up a fresh agent, then mark ready. Bails at any
    // checkpoint if cancelled, leaving inFlightAgent for run's finally to close.
    const buildFreshAgent = async (walletSecret: AgentWalletSecret): Promise<void> => {
      // cachedLedgers only gates the expensive pool warm-up in warmCache;
      // the pool list itself comes from the resolver when LEDGER_URL is set.
      const cachedLedgers = await loadCachedLedgers()
      if (cancelled) {
        return
      }

      await (ocaBundleResolver as RemoteOCABundleResolver)
        .checkForUpdates?.()
        .catch((err) => logger.warn(`OCA bundle update failed (continuing): ${err}`))
      ledgerResolver.logger = logger
      await ledgerResolver
        .checkForUpdates()
        .catch((err) => logger.warn(`Ledger update failed (continuing): ${err}`))

      // checkForUpdates can take seconds; a sign-out/reset may have flipped
      // `cancelled` meanwhile. Re-check before buildAgent so a discarded run never
      // (re)creates the Askar store — a factory reset clears the wallet key right
      // after, orphaning any store written here.
      if (cancelled) {
        return
      }

      const ledgers = Config.LEDGER_URL ? ledgerResolver.ledgers : (cachedLedgers ?? ledgerResolver.ledgers)

      inFlightAgent = buildAgent({
        ledgers,
        walletSecret,
        mediatorUrl,
        walletLabel,
        enableProxy,
        proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
        logger,
      })

      await initializeAgent(inFlightAgent)
      if (cancelled) {
        return
      }
      await inFlightAgent.didcomm.mediationRecipient.initiateMessagePickup(
        undefined,
        DidCommMediatorPickupStrategy.PickUpV2LiveMode
      )
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
    }

    // Surface a non-cancellation init failure: log, drop any stale agent so retry
    // rebuilds fresh instead of re-restarting a broken instance, then set error.
    const handleInitError = async (err: unknown): Promise<void> => {
      const appError =
        err instanceof AppError
          ? err
          : AppError.fromErrorDefinition(ErrorRegistry.AGENT_INITIALIZATION_ERROR, { cause: err })
      logger.error(`[${appError.appEvent}] Agent init failed: ${appError.message}`)
      if (agentRef.current) {
        await shutdownAgent(agentRef.current, logger)
        agentRef.current = null
        setAgent(null)
      }
      setError(appError)
      setStatus('error')
    }

    const run = async (): Promise<void> => {
      try {
        if (!walletKey) {
          throw AppError.fromErrorDefinition(ErrorRegistry.WALLET_SECRET_NOT_FOUND)
        }

        const walletSecret = { id: WALLET_ID, key: walletKey }

        if (agentRef.current) {
          const restartResult = await attemptRestart(agentRef.current)
          if (restartResult !== 'rebuild') {
            return
          }
        }

        await buildFreshAgent(walletSecret)
      } catch (err) {
        if (!cancelled) {
          await handleInitError(err)
        }
      } finally {
        if (inFlightAgent) {
          // Cancelled or partially-built agent — close its wallet handle. The
          // shutdown is serialized against the next build's open in agent-service.
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
    credDefs,
    schemas,
    ocaBundleResolver,
    refreshAttestationMonitor,
  ])

  const resetWallet = useCallback(async () => {
    // Ignore re-entrant requests (e.g. button spam). Without this, overlapping
    // resets race the shared wallet store — double shutdown/delete, or a later
    // reset deleting the store the prior reset's re-init just rebuilt — which
    // surfaces as a grab-bag of agent errors. initializingRef covers the window
    // after a reset bumps retryCount and the re-init is still running.
    if (resettingRef.current || initializingRef.current) {
      logger.info('WalletReset: a reset or agent init is already in progress, ignoring request')
      return
    }
    resettingRef.current = true

    try {
      const currentAgent = agentRef.current

      if (!currentAgent) {
        // Agent is unavailable — a previous reset was likely interrupted mid-shutdown
        // (e.g. app was killed). Build an uninitialized agent so we can reach the Askar
        // store manager and delete the store by its file URI without needing it open.
        if (walletKey) {
          await purgeWalletStore({
            ledgers: ledgerResolver.ledgers,
            walletSecret: { id: WALLET_ID, key: walletKey },
            mediatorUrl,
            walletLabel,
            enableProxy,
            proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
            logger,
          }).catch((err: unknown) =>
            logger.warn(`WalletReset: store deletion on recovery failed (may already be deleted): ${err}`)
          )
        }
        setError(null)
        setStatus('idle')
        setRetryCount((c) => c + 1)
        return
      }

      // 1. Stop background attestation polling so it doesn't interfere during teardown
      attestationMonitor?.stop()

      // 2. deregister push notifications - failures are non-fatal
      await deactivate(currentAgent).catch((err) => logger.warn(`Push notification deactivation failed: ${err}`))

      // 3. shut down the agent (closes connections, stops transports, etc.)
      await shutdownAgent(currentAgent, logger)

      // 4. delete the wallet store (credential data, connections, ect.)
      try {
        await deleteWalletStore(currentAgent)
      } finally {
        // 5. Clear agent state so the setup flow re-initializes a fresh wallet
        agentRef.current = null
        setAgent(null)
        setError(null)
        setStatus('idle')
        setRetryCount((c) => c + 1) // triggers useEffect to restart agent setup
      }
    } finally {
      resettingRef.current = false
    }
  }, [logger, attestationMonitor, walletKey, mediatorUrl, walletLabel, enableProxy])

  return { agent, status, error, retry, resetWallet }
}

export default useAgentSetupViewModel
