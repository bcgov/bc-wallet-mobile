import { type BCSCStore, useBCSCStore } from '@/bcsc-theme/storage'
import { selectEmailAddress, selectSessionRecoveryRequired, selectVerified } from '@/bcsc-theme/storage/hooks'
import { AccountSetupType } from '@/store'
import type { BCSCCardProcess, EvidenceMetadata } from 'react-native-bcsc-core'
import { useShallow } from 'zustand/react/shallow'
import { isCardInactive } from './card-inactive'
import { getVerificationState, VerificationState } from './verification-state'

/**
 * What the verification rules read: whether the user is verified, which setup step they're on and where to
 * resume. Flat, so a caller can predict the state after a write: `{ ...selectJourney(getBCSCState()), deviceCode }`.
 */
export interface VerificationJourney {
  /** A credential record exists, active or not */
  verified: boolean
  /** The record read at unlock says cancelled or expired */
  credentialDeactivated: boolean
  /** `bcscReason` from the saved account details */
  savedReason?: string
  inVerifyFlow: boolean
  refreshToken?: string
  sessionRecoveryRequired: boolean
  accountSetupType?: AccountSetupType
  cardProcess?: BCSCCardProcess
  serial?: string
  deviceCode?: string
  additionalEvidenceData: EvidenceMetadata[]
  emailAddress?: string
  isEmailVerified?: boolean
  userSkippedEmailVerification?: boolean
  userSubmittedVerificationVideo?: boolean
}

const NO_EVIDENCE: EvidenceMetadata[] = []

// Field for field what the transitional read view gave these rules
export const selectJourney = (s: BCSCStore): VerificationJourney => {
  const { request, flags, evidence, cardProcess } = s.verification
  return {
    verified: selectVerified(s),
    credentialDeactivated: Boolean(s.session.credentialDeactivated),
    savedReason: s.account.credentialMetadata?.bcscReason,
    inVerifyFlow: Boolean(s.session.inVerifyFlow),
    refreshToken: s.account.tokens?.refreshToken,
    sessionRecoveryRequired: selectSessionRecoveryRequired(s),
    accountSetupType: s.app.accountSetupType as AccountSetupType | undefined,
    cardProcess,
    serial: request?.csn,
    deviceCode: request?.deviceCode,
    additionalEvidenceData: (evidence as EvidenceMetadata[] | undefined) ?? NO_EVIDENCE,
    emailAddress: selectEmailAddress(s),
    // The flag as last set wins (entering a new email clears it); the request's verifiedEmail covers v3 records
    isEmailVerified: flags?.isEmailVerified ?? (request?.verifiedEmail ? true : undefined),
    userSkippedEmailVerification: flags?.userSkippedEmailVerification,
    userSubmittedVerificationVideo: flags?.userSubmittedVerificationVideo,
  }
}

// Re-renders only when one of the journey's fields changes
export const useJourney = (): VerificationJourney => useBCSCStore(useShallow(selectJourney))

export const journeyVerificationState = (
  j: Pick<VerificationJourney, 'verified' | 'credentialDeactivated' | 'savedReason' | 'inVerifyFlow' | 'refreshToken'>
): VerificationState =>
  getVerificationState({
    hasCredential: j.verified,
    cardInactive: isCardInactive({
      recordDeactivated: j.credentialDeactivated,
      savedReason: j.savedReason,
      hasRegistration: j.verified || Boolean(j.refreshToken),
    }),
    inVerifyFlow: j.inVerifyFlow,
    hasRefreshToken: Boolean(j.refreshToken),
  })
