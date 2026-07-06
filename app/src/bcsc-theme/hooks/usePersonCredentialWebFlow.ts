import { useBCSCAgent } from '@/bcsc-theme/features/agent'
import { connectToIASAgent } from '@/bcwallet-theme/features/person-flow/utils/BCIDHelper'
import { AttestationRestrictions } from '@/constants'
import { isProofRequestingAttestation } from '@/services/attestation'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { Linking } from 'react-native'
import { InAppBrowser } from 'react-native-inappbrowser-reborn'
import {
  DidCommCredentialEventTypes,
  DidCommCredentialState,
  DidCommCredentialStateChangedEvent,
  DidCommMediatorPickupStrategy,
  DidCommProofEventTypes,
  DidCommProofState,
  DidCommProofStateChangedEvent,
} from '@credo-ts/didcomm'
import { BCAgent } from '@utils/bc-agent-modules'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PersonCredentialWebFlowStatus =
  | 'idle'
  | 'connecting'
  | 'decliningProof'
  | 'authenticating'
  | 'pairing'
  | 'awaitingOffer'
  | 'acceptingOffer'
  | 'completed'
  | 'error'

type Subscription = { unsubscribe: () => void }

const LOG = '[PersonCredWebFlow]'

/**
 * The "old" prod BC Wallet Person Credential flow, adapted for optional attestation:
 *
 *   1. Connect to the IAS agent via the legacy connections/1.0 invitation
 *      (store.developer.environment.iasAgentInviteUrl). This handshake completes
 *      where the /credentials/v1/person didexchange OOB does not.
 *   2. Decline the issuer's attestation proof request (attestation is now optional
 *      server-side) instead of satisfying it via the attestation controller.
 *   3. Authenticate in the InAppBrowser against the IAS portal; success triggers
 *      the issuer to send the Person Credential offer over the connection.
 *   4. Accept the offer.
 *
 * The always-on AttestationMonitor is stopped for the duration so it doesn't race
 * us trying to fetch/present an attestation credential (the path that was failing).
 *
 * NOTE: the InAppBrowser (ASWebAuthenticationSession) only moves the app to
 * `inactive`, not `background`, so BCSCActivityContext's foreground pickup-restart
 * never fires and the offer stays queued at the mediator. We restart pickup
 * explicitly after the browser returns.
 */
export const usePersonCredentialWebFlow = (options?: { declineProof?: boolean }) => {
  // When false, leave the attestation proof unanswered instead of declining it
  // — used to test whether an explicit decline aborts the issuer's workflow.
  const declineProof = options?.declineProof ?? true
  const { agent } = useBCSCAgent()
  const [store] = useStore<BCState>()
  const [attestationMonitor, logger] = useServices([TOKENS.UTIL_ATTESTATION_MONITOR, TOKENS.UTIL_LOGGER])
  const [status, setStatus] = useState<PersonCredentialWebFlowStatus>('idle')
  const [error, setError] = useState<Error | undefined>()
  const [detail, setDetail] = useState<string | undefined>()
  const subscriptions = useRef<Subscription[]>([])

  const cleanup = useCallback(() => {
    subscriptions.current.forEach((sub) => sub.unsubscribe())
    subscriptions.current = []
  }, [])

  useEffect(() => cleanup, [cleanup])

  const fail = useCallback(
    (e: unknown) => {
      logger.error(`${LOG} failed: ${(e as Error)?.message}`)
      setError(e as Error)
      setStatus('error')
      cleanup()
    },
    [cleanup, logger]
  )

  const start = useCallback(async () => {
    if (!agent) {
      fail(new Error('Agent not ready'))
      return
    }
    const inviteUrl = store.developer.environment.iasAgentInviteUrl
    const iasPortalUrl = store.developer.environment.iasPortalUrl
    if (!inviteUrl) {
      fail(new Error(`No iasAgentInviteUrl for environment "${store.developer.environment.name}"`))
      return
    }

    cleanup()
    setError(undefined)
    setDetail(undefined)
    const bcAgent = agent as BCAgent
    logger.info(`${LOG} starting; env=${store.developer.environment.name}`)

    // Attestation is optional now: stop the AttestationMonitor so it doesn't try
    // to satisfy the attestation proof via the controller. We decline instead.
    attestationMonitor?.stop()

    try {
      // Decline the issuer's attestation proof request whenever it arrives. Set
      // this up before connecting since the IAS agent sends it right after the
      // handshake. Filter by attestation restrictions (connection id isn't known
      // yet at this point).
      const proofSubscription = bcAgent.events
        .observable<DidCommProofStateChangedEvent>(DidCommProofEventTypes.ProofStateChanged)
        .subscribe(async ({ payload: { proofRecord } }) => {
          logger.info(
            `${LOG} proof event id=${proofRecord.id} conn=${proofRecord.connectionId} state=${proofRecord.state}`
          )
          if (proofRecord.state !== DidCommProofState.RequestReceived) {
            return
          }
          try {
            const isAttestation = await isProofRequestingAttestation(proofRecord, bcAgent, AttestationRestrictions)
            if (!isAttestation) {
              logger.info(`${LOG} proof ${proofRecord.id} is not an attestation request; leaving it`)
              return
            }
            if (!declineProof) {
              logger.info(`${LOG} leaving attestation proof ${proofRecord.id} unanswered (skipDecline)`)
              setDetail('leaving attestation proof unanswered')
              return
            }
            setStatus('decliningProof')
            setDetail('declining attestation proof (optional)')
            logger.info(`${LOG} declining attestation proof ${proofRecord.id}`)
            // `sendProblemReport` tells the issuer we declined. Flip to false if the
            // issuer aborts issuance when it receives a problem report.
            await bcAgent.didcomm.proofs.declineRequest({
              proofExchangeRecordId: proofRecord.id,
              sendProblemReport: true,
            })
            logger.info(`${LOG} declined attestation proof ${proofRecord.id}`)
          } catch (e) {
            fail(e)
          }
        })
      subscriptions.current.push(proofSubscription)

      // 1. Connect to the IAS agent (legacy connections/1.0 — this completes).
      setStatus('connecting')
      setDetail('connecting to IAS agent (connections/1.0)')
      const details = await connectToIASAgent(bcAgent, inviteUrl, 'BC Wallet (dev)')
      const { connectionId, legacyConnectionDid } = details
      if (!connectionId || !legacyConnectionDid) {
        throw new Error('IAS connection did not yield a legacy DID')
      }
      logger.info(`${LOG} connected; connectionId=${connectionId} legacyDid=${legacyConnectionDid}`)
      setDetail(`connected; legacy DID ${legacyConnectionDid}`)

      // 2. Accept the Person Credential offer when it arrives on this connection.
      const offerSubscription = bcAgent.events
        .observable<DidCommCredentialStateChangedEvent>(DidCommCredentialEventTypes.DidCommCredentialStateChanged)
        .subscribe(async ({ payload: { credentialExchangeRecord: record } }) => {
          logger.info(`${LOG} credential event id=${record.id} conn=${record.connectionId} state=${record.state}`)
          if (record.connectionId !== connectionId) {
            return
          }
          try {
            if (record.state === DidCommCredentialState.OfferReceived) {
              setStatus('acceptingOffer')
              setDetail('accepting person credential offer')
              logger.info(`${LOG} accepting offer ${record.id}`)
              await bcAgent.didcomm.credentials.acceptOffer({ credentialExchangeRecordId: record.id })
            } else if (record.state === DidCommCredentialState.Done) {
              logger.info(`${LOG} credential done ${record.id}`)
              setStatus('completed')
              setDetail('person credential received')
              cleanup()
            }
          } catch (e) {
            fail(e)
          }
        })
      subscriptions.current.push(offerSubscription)

      // 3. Web-portal auth via InAppBrowser. On success the issuer sends the
      //    Person Credential offer over the connection above. Inlined (instead of
      //    BCIDHelper.authenticateWithServiceCard) so we can log the exact result
      //    type + redirect URL for diagnosis.
      setStatus('authenticating')
      setDetail('opening IAS portal (InAppBrowser)')
      const portalAuthUrl = `${iasPortalUrl}/${legacyConnectionDid}`
      const redirectUrl = `bcwallet://bcsc/v1/dids/${legacyConnectionDid}`
      logger.info(`${LOG} opening IAS portal ${portalAuthUrl} (redirect ${redirectUrl})`)
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(portalAuthUrl, redirectUrl, {
          dismissButtonStyle: 'cancel',
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: false,
          showInRecents: true,
        })
        const resultUrl = (result as { url?: string }).url
        logger.info(`${LOG} InAppBrowser result type=${result.type} url=${resultUrl ?? '(none)'}`)
        setDetail(`auth result: ${result.type}`)

        // The IAS portal completes auth by redirecting to the BC Services Card
        // app-to-app pairing deeplink (…://pair/…). In single-app that IS this
        // app, and openAuth captured the redirect — so re-inject it through the OS
        // so the existing deep-link → PairingService pipeline runs (navigates to
        // the ServiceLogin/pairing screen). Completing pairing authenticates the
        // user and triggers the issuer to send the credential offer.
        if (result.type === 'success' && resultUrl && resultUrl.includes('://pair/')) {
          setStatus('pairing')
          setDetail('handling pairing deeplink')
          logger.info(`${LOG} routing pairing deeplink into app`)
          await Linking.openURL(resultUrl)
        }
      } else {
        logger.info(`${LOG} InAppBrowser unavailable; opening portal via Linking`)
        await Linking.openURL(portalAuthUrl)
      }

      // 4. Flush anything the mediator queued while the auth sheet was up (the
      //    offer, and possibly the attestation proof). BCSCActivityContext only
      //    restarts pickup on a real background→foreground cycle, which the
      //    in-app auth sheet does not trigger.
      try {
        await bcAgent.didcomm.mediationRecipient.initiateMessagePickup(
          undefined,
          DidCommMediatorPickupStrategy.PickUpV2LiveMode
        )
        logger.info(`${LOG} restarted message pickup after auth`)
      } catch (e) {
        logger.error(`${LOG} failed to restart message pickup: ${(e as Error)?.message}`)
      }

      setStatus((current) => (current === 'authenticating' ? 'awaitingOffer' : current))
    } catch (e) {
      fail(e)
    }
  }, [
    agent,
    store.developer.environment.iasAgentInviteUrl,
    store.developer.environment.iasPortalUrl,
    store.developer.environment.name,
    attestationMonitor,
    declineProof,
    logger,
    cleanup,
    fail,
  ])

  const reset = useCallback(() => {
    cleanup()
    setError(undefined)
    setDetail(undefined)
    setStatus('idle')
    // Restore the AttestationMonitor we stopped at the start of the flow.
    if (agent) {
      attestationMonitor?.start(agent as BCAgent)
    }
  }, [cleanup, agent, attestationMonitor])

  return { start, reset, status, error, detail }
}

export default usePersonCredentialWebFlow
