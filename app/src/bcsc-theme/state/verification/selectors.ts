import type { BCSCStore } from '@/bcsc-theme/storage'
import { journeyVerificationState, selectJourney } from './journey'
import { VerificationState } from './verification-state'

/** Reads the verification rule's inputs from the store. */
export const selectVerificationState = (state: BCSCStore): VerificationState =>
  journeyVerificationState(selectJourney(state))
