import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import type { BCSCStore } from '@/bcsc-theme/storage'
import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { selectAccountPhase } from '../account/selectors'
import { journeyVerificationState, selectJourney } from '../verification/journey'
import { getHomeNotice, HomeNotice } from './home-notice'

/** Reads the Home notice rule's inputs from the store and the in-memory account. */
export const selectHomeNotice = (state: BCSCStore, account: BCSCAccount | null, now: Date): HomeNotice => {
  const journey = selectJourney(state)
  const { isVerified, isDeviceVerifiedByIas } = journeyVerificationState(journey)

  return getHomeNotice({
    isVerified,
    deviceVerifiedByIas: isDeviceVerifiedByIas,
    refreshTokenExpired: isRefreshTokenExpired(journey.refreshToken, now),
    requestStatus: state.session.verificationRequestStatus,
    hasVerificationRequest: Boolean(state.verification.request?.backCheckVerificationId),
    isIdStepCompleted: () => computeSetupStepCompletion(journey).id.completed,
    accountPhase: selectAccountPhase(state, account, now),
  })
}
