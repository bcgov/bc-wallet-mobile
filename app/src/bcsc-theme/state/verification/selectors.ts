import type { BCSCStore } from '@/bcsc-theme/storage'
import { selectDeviceCodeExpiresAt, selectVerificationRequestId } from '@/bcsc-theme/storage/hooks'
import { journeyVerificationState, selectJourney } from './journey'
import { getVerificationRequestCheck, VerificationRequestCheck } from './verification-request-check'
import { VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCSCStore): VerificationState =>
  journeyVerificationState(selectJourney(state))

/**
 * Reads the verification request check rule's inputs from the store.
 * `isVerified` comes from `selectVerificationState`, the one definition of "verified".
 */
export const selectVerificationRequestCheck = (state: BCSCStore): VerificationRequestCheck =>
  getVerificationRequestCheck({
    isVerified: selectVerificationState(state).isVerified,
    verificationRequestId: selectVerificationRequestId(state),
    deviceCode: state.verification.request?.deviceCode,
    userCode: state.verification.request?.userCode,
    deviceCodeExpiresAt: selectDeviceCodeExpiresAt(state),
  })
