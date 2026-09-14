import { declineProofRequest } from '@/hooks/useDeclineProofRequest'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import { DidCommProofExchangeRecord, DidCommProofState } from '@credo-ts/didcomm'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Auto-declines expired proof requests when developer mode is active
 *
 * @param agent - The active agent, or `null`/`undefined` before it is ready.
 * @param expiredProofs - Pending proof requests that have passed their TTL.
 */
export const useAutoDeclineExpiredProofs = (
  agent: Agent | null | undefined,
  expiredProofs: DidCommProofExchangeRecord[]
): void => {
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  // Ids we've already kicked off a decline for to prevent re decline errors
  const autoDecliningProofIds = useRef<Set<string>>(new Set())

  // Once a proof "expires" hide it from the notification list
  // If developer mode is active, auto decline the proof
  useEffect(() => {
    if (!store.preferences.developerModeEnabled || !agent) {
      return
    }

    expiredProofs.forEach((proof) => {
      if (autoDecliningProofIds.current.has(proof.id) || proof.state !== DidCommProofState.RequestReceived) {
        return
      }
      autoDecliningProofIds.current.add(proof.id)
      declineProofRequest(agent, proof, t('ProofRequest.Declined'))
    })
  }, [agent, expiredProofs, t, store.preferences.developerModeEnabled])
}
