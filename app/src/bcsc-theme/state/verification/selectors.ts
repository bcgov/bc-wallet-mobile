import { BCState, VerificationStatus } from '@/store'
import { getVerificationState, VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCState): VerificationState => {
  const { verified, verifiedStatus, refreshToken } = state.bcscSecure

  return getVerificationState({
    hasCredential: Boolean(verified),
    credentialDeactivated: verifiedStatus === VerificationStatus.DEACTIVATED,
    inVerifyFlow: verifiedStatus === VerificationStatus.IN_PROGRESS,
    hasRefreshToken: Boolean(refreshToken),
  })
}
