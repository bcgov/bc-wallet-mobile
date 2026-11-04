import CancelledReviewNotification from '@/bcsc-theme/features/notifications/CancelledReviewNotification'
import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import ContinueVerificationNotification from '@/bcsc-theme/features/notifications/ContinueVerificationNotification'
import PendingReviewNotification from '@/bcsc-theme/features/notifications/PendingReviewNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import VerifiedNotification from '@/bcsc-theme/features/notifications/VerifiedNotification'
import { useVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { AccountPhaseType } from '@/bcsc-theme/state/account/account-phase'
import { useAccountPhase } from '@/bcsc-theme/state/account/useAccountPhase'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { VerificationRequestStatus } from '@/constants'
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
  const accountPhase = useAccountPhase()
  const { verificationRequestStatus, verificationRequestId } = store.bcscSecure

  const customNotifications = useMemo((): JSX.Element[] => {
    // IAS has verified this device but the user hasn't finished setup: a request reviewed this session, or
    // tokens IAS issued found on the device (an account transfer, or a finish step whose credential write
    // failed). Not once that refresh token has expired: Finish needs a token refresh, which an expired token
    // can't get. Keyed on `verified` like the VerificationSuccess route this card opens (see MainStack). The
    // status can outlive that flip — handleAccountSetup sets `verified` before cleanup that can throw — and
    // the card would then be a button to a route that is no longer registered
    const finishSetupPending =
      !isVerified &&
      (verificationRequestStatus === VerificationRequestStatus.VERIFIED ||
        (isUserVerified(store.bcscSecure) && !store.bcscSecure.refreshTokenExpired))
    if (finishSetupPending) {
      return [<VerifiedNotification key={CustomNotificationId.BCSCVerified} />]
    }

    if (verificationRequestStatus === VerificationRequestStatus.CANCELLED) {
      return [<CancelledReviewNotification key={CustomNotificationId.BCSCCancelledReview} />]
    }

    if (verificationRequestStatus === VerificationRequestStatus.PENDING) {
      return [<PendingReviewNotification key={CustomNotificationId.BCSCPendingReview} />]
    }

    if (needsVerification && computeSetupStepCompletion(store).id.completed) {
      return [<ContinueVerificationNotification key={CustomNotificationId.BCSCContinueVerification} />]
    }

    if (needsVerification && !verificationRequestId) {
      return [<StartVerificationNotification key={CustomNotificationId.BCSCStartVerification} />]
    }

    if (accountPhase.phase === AccountPhaseType.Expired) {
      return [<CardExpiryNotification key={CustomNotificationId.AccountExpired} />]
    }

    if (accountPhase.phase === AccountPhaseType.ExpiringSoon) {
      return [
        <CardRenewalNotification
          key={CustomNotificationId.AccountRenewalAvailable}
          expiresAt={accountPhase.expiresAt}
        />,
      ]
    }

    return []
  }, [verificationRequestStatus, verificationRequestId, needsVerification, isVerified, accountPhase, store])

  return useMemo(
    () => ({
      customNotifications,
    }),
    [customNotifications]
  )
}
