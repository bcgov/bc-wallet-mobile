import CancelledReviewNotification from '@/bcsc-theme/features/notifications/CancelledReviewNotification'
import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import ContinueVerificationNotification from '@/bcsc-theme/features/notifications/ContinueVerificationNotification'
import PendingReviewNotification from '@/bcsc-theme/features/notifications/PendingReviewNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import VerifiedNotification from '@/bcsc-theme/features/notifications/VerifiedNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { JSX, useMemo } from 'react'

export enum CustomNotificationId {
  BCSCStartVerification = 'BCSCStartVerification',
  BCSCContinueVerification = 'BCSCContinueVerification',
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
  const { needsVerification, isVerified } = useVerificationStatus()
  const [store] = useStore<BCState>()
  const { verificationRequestStatus, verificationRequestId } = store.bcscSecure

  const customNotifications = useMemo((): JSX.Element[] => {
    // Keyed on `verified` like the VerificationSuccess route this card opens (see MainStack). The status
    // can outlive that flip — handleAccountSetup sets `verified` before cleanup that can throw — and the
    // card would then be a button to a route that is no longer registered (#4719)
    if (verificationRequestStatus === 'verified' && !isVerified) {
      return [<VerifiedNotification key={CustomNotificationId.BCSCVerified} />]
    }

    if (verificationRequestStatus === 'cancelled') {
      return [<CancelledReviewNotification key={CustomNotificationId.BCSCCancelledReview} />]
    }

    if (verificationRequestStatus === 'pending') {
      return [<PendingReviewNotification key={CustomNotificationId.BCSCPendingReview} />]
    }

    if (needsVerification && computeSetupStepCompletion(store).id.completed) {
      return [<ContinueVerificationNotification key={CustomNotificationId.BCSCContinueVerification} />]
    }

    if (needsVerification && !verificationRequestId) {
      return [<StartVerificationNotification key={CustomNotificationId.BCSCStartVerification} />]
    }

    if (store.bcsc.showAccountExpiryNotification) {
      return [<CardExpiryNotification key={CustomNotificationId.AccountExpired} />]
    }

    if (store.bcsc.showCardRenewalNotification) {
      return [<CardRenewalNotification key={CustomNotificationId.AccountRenewalAvailable} />]
    }

    return []
  }, [verificationRequestStatus, verificationRequestId, needsVerification, isVerified, store])

  return useMemo(
    () => ({
      customNotifications,
    }),
    [customNotifications]
  )
}
