import { BCState } from '@/store'
import { isCardInactive } from './card-inactive'
import { getVerificationRequestCheck, VerificationRequestCheck } from './verification-request-check'
import { getVerificationState, VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCState): VerificationState => {
  const { hasCredentialRecord, credentialDeactivated, inVerifyFlow, refreshToken } = state.bcscSecure
  const cardInactive = isCardInactive({
    recordDeactivated: credentialDeactivated,
    savedReason: state.bcsc.credentialMetadata?.bcscReason,
    hasRegistration: hasCredentialRecord || Boolean(refreshToken),
  })

  return getVerificationState({
    hasCredential: hasCredentialRecord,
    cardInactive,
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
