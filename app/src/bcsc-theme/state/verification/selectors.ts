import { BCState } from '@/store'
import { getVerificationRequestCheck, VerificationRequestCheck } from './verification-request-check'
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

/**
 * Reads the verification request check rule's inputs from the store.
 * `isVerified` comes from `selectVerificationState`, the one definition of "verified".
 */
export const selectVerificationRequestCheck = (state: BCState): VerificationRequestCheck => {
  const { verificationRequestId, deviceCode, userCode, deviceCodeExpiresAt } = state.bcscSecure

  return getVerificationRequestCheck({
    isVerified: selectVerificationState(state).isVerified,
    verificationRequestId,
    deviceCode,
    userCode,
    deviceCodeExpiresAt,
  })
}
