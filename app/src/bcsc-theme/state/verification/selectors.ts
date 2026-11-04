import { BCState } from '@/store'
import { getVerificationState, VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCState): VerificationState => {
  const { verified, credentialDeactivated, inVerifyFlow, refreshToken } = state.bcscSecure

  return getVerificationState({
    hasCredential: Boolean(verified),
    credentialDeactivated,
    inVerifyFlow,
    hasRefreshToken: Boolean(refreshToken),
  })
}
