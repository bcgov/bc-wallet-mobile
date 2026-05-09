import { useConnectionByOutOfBandId, useNotifications, useOutOfBandById } from '@bifold/core'
import { useEffect, useMemo, useState } from 'react'

export const GoalCodes = {
  proofRequestVerify: 'aries.vc.verify',
  proofRequestVerifyOnce: 'aries.vc.verify.once',
  credentialOffer: 'aries.vc.issue',
} as const

export type ConnectionLoadingState =
  | { kind: 'loading' }
  | { kind: 'connection' }
  | { kind: 'proof'; proofId: string }
  | { kind: 'credentialOffer'; credentialId: string }

interface NotificationLike {
  id: string
  type?: string
  connectionId?: string
  threadId?: string
}

const useConnectionLoadingViewModel = (oobRecordId: string): ConnectionLoadingState => {
  const oobRecord = useOutOfBandById(oobRecordId)
  const connection = useConnectionByOutOfBandId(oobRecordId)
  const notifications = useNotifications({}) as unknown as NotificationLike[]
  const [matchedNotification, setMatchedNotification] = useState<NotificationLike | undefined>(undefined)

  // Find the first non-BasicMessage notification that belongs to this OOB / connection.
  useEffect(() => {
    if (!notifications.length) {
      return
    }
    if (matchedNotification) {
      return
    }

    const tags = oobRecord?.getTags?.() as { invitationRequestsThreadIds?: string[] } | undefined
    const reuseConnectionId = oobRecord?.reuseConnectionId

    const found = notifications.find((n) => {
      if (n.type === 'BasicMessageRecord') {
        return false
      }
      if (connection && n.connectionId === connection.id) {
        return true
      }
      if (reuseConnectionId && n.connectionId === reuseConnectionId) {
        return true
      }
      if (n.threadId && tags?.invitationRequestsThreadIds?.includes(n.threadId)) {
        return true
      }
      return false
    })
    if (found) {
      setMatchedNotification(found)
    }
  }, [notifications, oobRecord, connection, matchedNotification])

  return useMemo<ConnectionLoadingState>(() => {
    const goalCode = oobRecord?.outOfBandInvitation?.goalCode

    // Connection without a recognized goal code: lands on Home as the terminal state.
    if (connection && !Object.values(GoalCodes).includes(goalCode as (typeof GoalCodes)[keyof typeof GoalCodes])) {
      return { kind: 'connection' }
    }

    if (!matchedNotification) {
      return { kind: 'loading' }
    }

    if (goalCode === GoalCodes.proofRequestVerify || goalCode === GoalCodes.proofRequestVerifyOnce) {
      return { kind: 'proof', proofId: matchedNotification.id }
    }
    if (goalCode === GoalCodes.credentialOffer) {
      return { kind: 'credentialOffer', credentialId: matchedNotification.id }
    }

    // Connectionless proof request — no connection but a notification arrived.
    if (!connection) {
      return { kind: 'proof', proofId: matchedNotification.id }
    }

    return { kind: 'loading' }
  }, [oobRecord, connection, matchedNotification])
}

export default useConnectionLoadingViewModel
