import CancelledReviewNotification from '@/bcsc-theme/features/notifications/CancelledReviewNotification'
import PendingReviewNotification from '@/bcsc-theme/features/notifications/PendingReviewNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { JSX, useCallback, useMemo, useState } from 'react'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
  BCSCPendingReview = 'BCSCPendingReview',
  BCSCCancelledReview = 'BCSCCancelledReview',
}

/**
 * Hook to manage custom notifications in the app.
 *
 * @returns An object containing an array of custom notifications to be displayed on the Home screen.
 */
export const useCustomNotifications = () => {
  const { needsVerification } = useVerificationStatus()
  const [store] = useStore<BCState>()
  const verificationRequestStatus = store.bcscSecure.verificationRequestStatus
  const [dismissedIds, setDismissedIds] = useState<Set<CustomNotificationId>>(new Set())

  const dismissCustomNotification = useCallback((id: CustomNotificationId) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }, [])

  const customNotifications = useMemo((): JSX.Element[] => {
    if (verificationRequestStatus === 'cancelled') {
      return [<CancelledReviewNotification key={CustomNotificationId.BCSCCancelledReview} />]
    }

    if (verificationRequestStatus === 'pending') {
      return [<PendingReviewNotification key={CustomNotificationId.BCSCPendingReview} />]
    }

    if (needsVerification && !dismissedIds.has(CustomNotificationId.BCSCStartVerification)) {
      return [
        <StartVerificationNotification
          key={CustomNotificationId.BCSCStartVerification}
          onClose={() => dismissCustomNotification(CustomNotificationId.BCSCStartVerification)}
        />,
      ]
    }

    return []
  }, [verificationRequestStatus, needsVerification, dismissedIds, dismissCustomNotification])

  return useMemo(
    () => ({
      customNotifications,
      dismissCustomNotification,
    }),
    [customNotifications, dismissCustomNotification]
  )
}
