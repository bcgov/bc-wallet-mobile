import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { getVerificationStatus } from '@/bcsc-theme/hooks/useVerificationStatus'
import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import { isUserVerified } from '@/bcsc-theme/utils/bcsc-credential'
import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { BCState } from '@/store'
import { selectAccountPhase } from '../account/selectors'
import { getHomeNotice, HomeNotice } from './home-notice'

/** Reads the Home notice rule's inputs from the store and the in-memory account. */
export const selectHomeNotice = (state: BCState, account: BCSCAccount | null, now: Date): HomeNotice => {
  const { bcscSecure } = state
  const { isVerified, needsVerification } = getVerificationStatus(bcscSecure)

  return getHomeNotice({
    isVerified,
    needsVerification,
    deviceVerifiedByIas: isUserVerified(bcscSecure),
    refreshTokenExpired: isRefreshTokenExpired(bcscSecure.refreshToken, now.getTime()),
    requestStatus: bcscSecure.verificationRequestStatus,
    hasVerificationRequest: Boolean(bcscSecure.verificationRequestId),
    isIdStepCompleted: () => computeSetupStepCompletion(state).id.completed,
    accountPhase: selectAccountPhase(state, account, now),
  })
}
