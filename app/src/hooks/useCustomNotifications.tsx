import CancelledReviewNotification from '@/bcsc-theme/features/notifications/CancelledReviewNotification'
import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import PendingReviewNotification from '@/bcsc-theme/features/notifications/PendingReviewNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import VerifiedNotification from '@/bcsc-theme/features/notifications/VerifiedNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { JSX, useCallback, useMemo, useState } from 'react'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
  BCSCPendingReview = 'BCSCPendingReview',
  BCSCCancelledReview = 'BCSCCancelledReview',
  BCSCVerified = 'BCSCVerified',
  AccountExpired = 'AccountExpired',
  AccountRenewalAvailable = 'AccountRenewalAvailable',
}

/**
 * Hook to manage custom notifications in the app.
 *
 * @returns An object containing an array of custom notifications to be displayed on the Home screen.
 */
export const useCustomNotifications = () => {
  const { needsVerification } = useVerificationStatus()
  const [store] = useStore<BCState>()
  const { verificationRequestStatus, verificationRequestId } = store.bcscSecure
  const [dismissedIds, setDismissedIds] = useState<Set<CustomNotificationId>>(new Set())

  const dismissCustomNotification = useCallback((id: CustomNotificationId) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }, [])

  const customNotifications = useMemo((): JSX.Element[] => {
    if (verificationRequestStatus === 'verified') {
      return [<VerifiedNotification key={CustomNotificationId.BCSCVerified} />]
    }

    if (verificationRequestStatus === 'cancelled') {
      return [<CancelledReviewNotification key={CustomNotificationId.BCSCCancelledReview} />]
    }

    if (verificationRequestStatus === 'pending') {
      return [<PendingReviewNotification key={CustomNotificationId.BCSCPendingReview} />]
    }

    if (needsVerification && !verificationRequestId && !dismissedIds.has(CustomNotificationId.BCSCStartVerification)) {
      return [<StartVerificationNotification key={CustomNotificationId.BCSCStartVerification} />]
    }

    if (store.bcsc.showAccountExpiryNotification) {
      return [<CardExpiryNotification key={CustomNotificationId.AccountExpired} />]
    }

    if (store.bcsc.showCardRenewalNotification) {
      return [<CardRenewalNotification key={CustomNotificationId.AccountRenewalAvailable} />]
    }

    return []
  }, [
    verificationRequestStatus,
    verificationRequestId,
    needsVerification,
    dismissedIds,
    store.bcsc.showAccountExpiryNotification,
    store.bcsc.showCardRenewalNotification,
  ])

  return useMemo(
    () => ({
      customNotifications,
      dismissCustomNotification,
    }),
    [customNotifications, dismissCustomNotification]
  )
}
