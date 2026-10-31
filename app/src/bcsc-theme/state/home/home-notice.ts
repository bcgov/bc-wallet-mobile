import { VerificationRequestStatus } from '@/constants'
import { AccountPhase, AccountPhaseType } from '../account/account-phase'

export interface HomeNoticeFacts {
  isVerified: boolean
  needsVerification: boolean
  /** IAS has issued this device tokens (a transfer, or a finish step whose credential write failed) */
  deviceVerifiedByIas: boolean
  refreshTokenExpired: boolean
  requestStatus?: VerificationRequestStatus
  hasVerificationRequest: boolean
  /** Lazy: only read once no earlier notice matched, so malformed retained evidence can't block them */
  isIdStepCompleted: () => boolean
  /** Already decided from the card's dates, so this rule does no date math */
  accountPhase: AccountPhase
}

export enum HomeNoticeType {
  None = 'None',
  BCSCStartVerification = 'BCSCStartVerification',
  BCSCContinueVerification = 'BCSCContinueVerification',
  BCSCPendingReview = 'BCSCPendingReview',
  BCSCCancelledReview = 'BCSCCancelledReview',
  /** Finish setup: IAS has verified the device but the user hasn't completed setup */
  BCSCVerified = 'BCSCVerified',
  AccountExpired = 'AccountExpired',
  AccountRenewalAvailable = 'AccountRenewalAvailable',
}

export type HomeNotice =
  | {
      type: Exclude<HomeNoticeType, HomeNoticeType.AccountRenewalAvailable>
    }
  | { type: HomeNoticeType.AccountRenewalAvailable; expiresAt: Date }

/** The single definition of which notice Home shows; the first matching check wins. */
export const getHomeNotice = (facts: HomeNoticeFacts): HomeNotice => {
  const {
    isVerified,
    needsVerification,
    deviceVerifiedByIas,
    refreshTokenExpired,
    requestStatus,
    hasVerificationRequest,
    isIdStepCompleted,
    accountPhase,
  } = facts

  // Keyed on `verified` because MainStack unregisters VerificationSuccess when it flips; an expired
  // refresh token can't finish setup, which needs a token refresh
  if (
    !isVerified &&
    (requestStatus === VerificationRequestStatus.VERIFIED || (deviceVerifiedByIas && !refreshTokenExpired))
  ) {
    return { type: HomeNoticeType.BCSCVerified }
  }

  if (requestStatus === VerificationRequestStatus.CANCELLED) {
    return { type: HomeNoticeType.BCSCCancelledReview }
  }

  if (requestStatus === VerificationRequestStatus.PENDING) {
    return { type: HomeNoticeType.BCSCPendingReview }
  }

  if (needsVerification && isIdStepCompleted()) {
    return { type: HomeNoticeType.BCSCContinueVerification }
  }

  if (needsVerification && !hasVerificationRequest) {
    return { type: HomeNoticeType.BCSCStartVerification }
  }

  if (accountPhase.phase === AccountPhaseType.Expired) {
    return { type: HomeNoticeType.AccountExpired }
  }

  if (accountPhase.phase === AccountPhaseType.ExpiringSoon) {
    return { type: HomeNoticeType.AccountRenewalAvailable, expiresAt: accountPhase.expiresAt }
  }

  return { type: HomeNoticeType.None }
}
