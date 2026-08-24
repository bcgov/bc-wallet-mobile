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
  teardownAgent: () => Promise<void>
  waitForAgent: () => Promise<Agent | null>
}

const useAgentSetupViewModel = (): AgentSetupResult => {
  const [store] = useStore<BCState>()
  const [logger, attestationMonitor, credentialProvisioningMonitor, credDefs, schemas, ocaBundleResolver] = useServices(
    [
      TOKENS.UTIL_LOGGER,
      TOKENS.UTIL_ATTESTATION_MONITOR,
      TOKENS.UTIL_CREDENTIAL_PROVISIONING_MONITOR,
      TOKENS.CACHE_CRED_DEFS,
      TOKENS.CACHE_SCHEMAS,
      TOKENS.UTIL_OCA_RESOLVER,
    ]
  )

  const [status, setStatus] = useState<AgentSetupStatus>('idle')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const agentRef = useRef<Agent | null>(null)
  const agentPromiseRef = useRef<Promise<Agent | null> | null>(null)
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

  const refreshMonitors = useCallback(
    (liveAgent: Agent) => {
      attestationMonitor?.stop()
      attestationMonitor?.start(liveAgent)
      credentialProvisioningMonitor?.stop()
      credentialProvisioningMonitor?.start(liveAgent)
    },
    [attestationMonitor, credentialProvisioningMonitor]
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
      refreshMonitors(restarted)
      agentRef.current = restarted
      setAgent(restarted)
      setStatus('ready')
      return 'ready'
    }

    // Build, initialize, and wire up a fresh agent, then mark ready. Bails at any
    // checkpoint if cancelled, leaving inFlightAgent for run's finally to close.
    const buildFreshAgent = async (walletSecret: AgentWalletSecret): Promise<void> => {
      // cachedLedgers only gates the expensive pool warm-up in warmCache. The
      // pool list always comes from the resolver, which serves remote/cached
      // genesis when auto-update is on and the bundled snapshot when it is off —
      // so LEDGER_AUTO_UPDATE=false means bundled-only, never a stale prior cache.
      const cachedLedgers = await loadCachedLedgers()
      if (cancelled) {
        return
      }

      await (ocaBundleResolver as RemoteOCABundleResolver)
        .checkForUpdates?.()
        .catch((err) => logger.warn(`OCA bundle update failed (continuing): ${err}`))
      ledgerResolver.logger = logger
      await ledgerResolver.checkForUpdates().catch((err) => logger.warn(`Ledger update failed (continuing): ${err}`))

      // checkForUpdates can take seconds; a sign-out/reset may have flipped
      // `cancelled` meanwhile. Re-check before buildAgent so a discarded run never
      // (re)creates the Askar store — a factory reset clears the wallet key right
      // after, orphaning any store written here.
      if (cancelled) {
        return
      }

      const ledgers = ledgerResolver.ledgers

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

      refreshMonitors(inFlightAgent)
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
      // appError.message is a fixed registry string, and Credo nests its own wrappers
      // (e.g. onInitializeContext -> ...), so walk the whole cause chain. Without this
      // every agent init failure logs identically and the real error is never visible.
      const describeCauseChain = (root: unknown): string => {
        const lines: string[] = []
        let current: unknown = root
        let depth = 0
        while (current !== undefined && current !== null && depth < 10) {
          if (current instanceof Error) {
            lines.push(`${'  '.repeat(depth)}${depth ? '└─ ' : ''}${current.name}: ${current.message}`)
            current = (current as { cause?: unknown }).cause
          } else {
            lines.push(`${'  '.repeat(depth)}${depth ? '└─ ' : ''}${String(current)}`)
            current = undefined
          }
          depth++
        }
        return lines.length ? lines.join('\n') : 'none'
      }
      const deepest = (root: unknown): Error | undefined => {
        let current: unknown = root
        let last: Error | undefined
        let depth = 0
        while (current instanceof Error && depth < 10) {
          last = current
          current = (current as { cause?: unknown }).cause
          depth++
        }
        return last
      }
      const rootCause = deepest(appError.cause)
      logger.error(
        `[${appError.appEvent}] Agent init failed: ${appError.message}\n` +
          `cause chain:\n${describeCauseChain(appError.cause)}\n` +
          `root cause stack: ${rootCause?.stack ?? 'none'}`
      )
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

    // Store the promise so consumers can await agent initialization
    agentPromiseRef.current = run().then(() => agentRef.current)

    return () => {
      cancelled = true
      initializingRef.current = false
      agentPromiseRef.current = null
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
    refreshMonitors,
    ocaBundleResolver,
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

  // Permanent agent teardown (e.g. factory reset). Unlike resetWallet this never
  // re-initializes: it shuts down, deletes the wallet store, and nulls the agent so
  // any consumer still mounted against a transient render (see RootStack's
  // hasAccount/showVerifyStack derivation) sees `agent: null` and skips its
  // mount-time storage reads instead of racing Credo's store-not-found ->
  // auto-provision fallback against the just-deleted store.
  //
  // Guards against a concurrent resetWallet (and a re-entrant teardownAgent) via
  // resettingRef, but — unlike resetWallet — does NOT check initializingRef: this is
  // a destructive path that must always delete the store when a live agent exists,
  // never silently no-op just because an init happens to be in flight.
  const teardownAgent = useCallback(async () => {
    if (resettingRef.current) {
      logger.info('AgentTeardown: a reset is already in progress, ignoring request')
      return
    }

    const currentAgent = agentRef.current
    if (!currentAgent) {
      return
    }

    resettingRef.current = true

    try {
      // Stop both monitors — a provisioning/attestation poll firing against the
      // about-to-be-deleted store is exactly the "mounted consumer issuing a
      // storage op against a deleted store" scenario this teardown exists to prevent.
      attestationMonitor?.stop()
      credentialProvisioningMonitor?.stop()

      await shutdownAgent(currentAgent, logger)

      try {
        await deleteWalletStore(currentAgent)
      } catch (err) {
        logger.warn(`AgentTeardown: wallet store deleteStore() failed; wallet file may persist: ${err}`)
      }
    } finally {
      agentRef.current = null
      setAgent(null)
      setError(null)
      setStatus('idle')
      resettingRef.current = false
    }
  }, [logger, attestationMonitor, credentialProvisioningMonitor])

  /**
   * Waits for the agent to be ready and returns it, or null if the agent is not ready or has failed to initialize.
   *
   * @returns A promise that resolves to the agent or null if not ready.
   */
  const waitForAgent = useCallback(async (): Promise<Agent | null> => {
    if (agentRef.current) {
      return agentRef.current
    }

    if (statusRef.current !== 'initializing') {
      return null
    }

    return agentPromiseRef.current
  }, [])

  return { agent, status, error, retry, resetWallet, teardownAgent, waitForAgent }
}

export default useAgentSetupViewModel
