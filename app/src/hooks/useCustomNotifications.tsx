import CancelledReviewNotification from '@/bcsc-theme/features/notifications/CancelledReviewNotification'
import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import ContinueVerificationNotification from '@/bcsc-theme/features/notifications/ContinueVerificationNotification'
import PendingReviewNotification from '@/bcsc-theme/features/notifications/PendingReviewNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import VerifiedNotification from '@/bcsc-theme/features/notifications/VerifiedNotification'
import { HomeNotice, HomeNoticeType } from '@/bcsc-theme/state/home/home-notice'
import { useHomeNotice } from '@/bcsc-theme/state/home/useHomeNotice'
import { JSX, useMemo } from 'react'

const toElements = (notice: HomeNotice): JSX.Element[] => {
  switch (notice.type) {
    case HomeNoticeType.BCSCVerified:
      return [<VerifiedNotification key={notice.type} />]
    case HomeNoticeType.BCSCCancelledReview:
      return [<CancelledReviewNotification key={notice.type} />]
    case HomeNoticeType.BCSCPendingReview:
      return [<PendingReviewNotification key={notice.type} />]
    case HomeNoticeType.BCSCContinueVerification:
      return [<ContinueVerificationNotification key={notice.type} />]
    case HomeNoticeType.BCSCStartVerification:
      return [<StartVerificationNotification key={notice.type} />]
    case HomeNoticeType.AccountExpired:
      return [<CardExpiryNotification key={notice.type} />]
    case HomeNoticeType.AccountRenewalAvailable:
      return [<CardRenewalNotification key={notice.type} expiresAt={notice.expiresAt} />]
    case HomeNoticeType.None:
      return []
  }
}

/**
 * Hook to manage custom notifications in the app.
 *
 * @returns An object containing an array of custom notifications to be displayed on the Home screen.
 */
export const useCustomNotifications = () => {
  const notice = useHomeNotice()

  return useMemo(() => ({ customNotifications: toElements(notice) }), [notice])
}
