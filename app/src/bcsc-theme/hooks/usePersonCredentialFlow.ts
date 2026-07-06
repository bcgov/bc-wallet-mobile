import { useBCSCAgent } from '@/bcsc-theme/features/agent'
import {
  DidCommConnectionEventTypes,
  DidCommConnectionStateChangedEvent,
  DidCommCredentialEventTypes,
  DidCommCredentialState,
  DidCommCredentialStateChangedEvent,
  DidCommDidExchangeState,
  DidCommProofEventTypes,
  DidCommProofState,
  DidCommProofStateChangedEvent,
} from '@credo-ts/didcomm'
import { BCAgent } from '@utils/bc-agent-modules'
import { useCallback, useEffect, useRef, useState } from 'react'
import useApi from '../api/hooks/useApi'

export type PersonCredentialFlowStatus =
  | 'idle'
  | 'requestingInvitation'
  | 'connecting'
  | 'decliningProof'
  | 'awaitingOffer'
  | 'acceptingOffer'
  | 'completed'
  | 'error'

type Subscription = { unsubscribe: () => void }

// The DIDComm connection can take a while to complete over the mediator, so we
// don't block hard on it. After this long without completion we surface the
// connection's actual state for diagnosis, but keep listening.
const CONNECTION_DIAGNOSTIC_MS = 45000

/**
 * Drives the BCSC-initiated, attestation-optional Person Credential flow end to end:
 *
 *   1. POST /credentials/v1/person to get an issuer OOB invitation.
 *   2. Receive the invitation; the connection completes in the background.
 *   3. When the issuer sends the (now optional) attestation proof request on that
 *      connection, decline it immediately.
 *   4. Accept the Person Credential offer when it arrives; finish on Done.
 *
 * Event subscriptions are registered up front (keyed by connection id) so a slow
 * connection never causes a missed proof/offer. `detail` carries the live
 * connection state for debugging (e.g. "connection: request-sent").
 */
export const usePersonCredentialFlow = () => {
  const { agent } = useBCSCAgent()
  const { personCredential } = useApi()
  const [status, setStatus] = useState<PersonCredentialFlowStatus>('idle')
  const [error, setError] = useState<Error | undefined>()
  const [detail, setDetail] = useState<string | undefined>()
  const subscriptions = useRef<Subscription[]>([])

  const cleanup = useCallback(() => {
    subscriptions.current.forEach((sub) => sub.unsubscribe())
    subscriptions.current = []
  }, [])

  // Tear down any live subscriptions if the consumer unmounts mid-flow.
  useEffect(() => cleanup, [cleanup])

  const fail = useCallback(
    (e: unknown) => {
      setError(e as Error)
      setStatus('error')
      cleanup()
    },
    [cleanup]
  )

  const start = useCallback(async () => {
    if (!agent) {
      fail(new Error('Agent not ready'))
      return
    }

    cleanup()
    setError(undefined)
    setDetail(undefined)
    const bcAgent = agent as BCAgent

    try {
      // 1. Ask the issuer for an OOB invitation.
      setStatus('requestingInvitation')
      const { invitation_url } = await personCredential.createPersonCredential()
      if (!invitation_url) {
        throw new Error('No invitation_url returned from /credentials/v1/person')
      }

      // 2. Receive the invitation. The didexchange connection completes async.
      setStatus('connecting')
      const invitation = await bcAgent.didcomm.oob.parseInvitation(invitation_url)
      const { connectionRecord } = await bcAgent.didcomm.oob.receiveInvitation(invitation, {
        label: 'Person Credential Issuer',
      })
      if (!connectionRecord) {
        throw new Error('Failed to create a connection from the invitation')
      }
      const connectionId = connectionRecord.id
      setDetail(`connection: ${connectionRecord.state}`)

      // Surface connection progress and advance once it completes.
      const connectionSubscription = bcAgent.events
        .observable<DidCommConnectionStateChangedEvent>(DidCommConnectionEventTypes.DidCommConnectionStateChanged)
        .subscribe(({ payload: { connectionRecord: record } }) => {
          if (record.id !== connectionId) {
            return
          }
          setDetail(`connection: ${record.state}`)
          if (record.state === DidCommDidExchangeState.Completed) {
            setStatus((current) => (current === 'connecting' ? 'awaitingOffer' : current))
          }
        })

      // 3. Decline the issuer's attestation proof request as soon as it arrives.
      //    Attestation is optional server-side, so the issuer still proceeds to
      //    the credential offer after the decline.
      const proofSubscription = bcAgent.events
        .observable<DidCommProofStateChangedEvent>(DidCommProofEventTypes.ProofStateChanged)
        .subscribe(async ({ payload: { proofRecord } }) => {
          if (proofRecord.connectionId !== connectionId || proofRecord.state !== DidCommProofState.RequestReceived) {
            return
          }
          try {
            setStatus('decliningProof')
            // `sendProblemReport` tells the issuer we declined. Flip to false if the
            // issuer aborts the offer when it receives a problem report.
            await bcAgent.didcomm.proofs.declineRequest({
              proofExchangeRecordId: proofRecord.id,
              sendProblemReport: true,
            })
            setStatus('awaitingOffer')
          } catch (e) {
            fail(e)
          }
        })

      // 4. Accept the Person Credential offer on this connection; finish on Done.
      const offerSubscription = bcAgent.events
        .observable<DidCommCredentialStateChangedEvent>(DidCommCredentialEventTypes.DidCommCredentialStateChanged)
        .subscribe(async ({ payload: { credentialExchangeRecord } }) => {
          if (credentialExchangeRecord.connectionId !== connectionId) {
            return
          }
          try {
            if (credentialExchangeRecord.state === DidCommCredentialState.OfferReceived) {
              setStatus('acceptingOffer')
              await bcAgent.didcomm.credentials.acceptOffer({
                credentialExchangeRecordId: credentialExchangeRecord.id,
              })
            } else if (credentialExchangeRecord.state === DidCommCredentialState.Done) {
              setStatus('completed')
              cleanup()
            }
          } catch (e) {
            fail(e)
          }
        })

      subscriptions.current.push(connectionSubscription, proofSubscription, offerSubscription)

      // Diagnostic only: if the connection hasn't completed in time, report its
      // actual state (e.g. stuck at "request-sent" = issuer never answered the
      // didexchange request). Non-fatal — subscriptions above stay live so a
      // late-completing connection still proceeds to decline/accept.
      try {
        await bcAgent.didcomm.connections.returnWhenIsConnected(connectionId, { timeoutMs: CONNECTION_DIAGNOSTIC_MS })
      } catch {
        const record = await bcAgent.didcomm.connections.getById(connectionId)
        if (record.state !== DidCommDidExchangeState.Completed) {
          setDetail(
            `connection stuck at "${record.state}" after ${CONNECTION_DIAGNOSTIC_MS / 1000}s — issuer did not complete didexchange`
          )
        }
      }
    } catch (e) {
      fail(e)
    }
  }, [agent, personCredential, cleanup, fail])

  const reset = useCallback(() => {
    cleanup()
    setError(undefined)
    setDetail(undefined)
    setStatus('idle')
  }, [cleanup])

  return { start, reset, status, error, detail }
}

export default usePersonCredentialFlow
