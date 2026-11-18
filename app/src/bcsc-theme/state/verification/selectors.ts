import { BCState } from '@/store'
import { isCardInactive } from './card-inactive'
import { getVerificationState, VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCState): VerificationState => {
  const { verified, credentialDeactivated, inVerifyFlow, refreshToken } = state.bcscSecure
  const cardInactive = isCardInactive({
    recordDeactivated: credentialDeactivated,
    savedReason: state.bcsc.credentialMetadata?.bcscReason,
  })

  return getVerificationState({
    hasCredential: Boolean(verified),
    cardInactive,
    inVerifyFlow,
    hasRefreshToken: Boolean(refreshToken),
  })
}
