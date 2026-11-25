/** What the server or device told us; the rule below is the only place that turns these into conclusions. */
export interface VerificationFacts {
  /** The native credential record is present, active or not: setup finished on this device */
  hasCredential: boolean
  /** The card is cancelled or expired, from `isCardInactive` */
  cardInactive: boolean
  /** The user is in the verify flow this session */
  inVerifyFlow: boolean
  /** IAS has issued this device a refresh token */
  hasRefreshToken: boolean
}

/**
 * Split on `isVerified` so the combinations the rule can't produce don't type-check. `isCardInactive`
 * stays a boolean on both sides: a cancelled or expired card is still verified.
 */
export type VerificationState =
  | {
      /** Setup finished on this device */
      isVerified: true
      isDeviceVerifiedByIas: true
      isVerificationInProgress: false
      needsVerification: false
      isCardInactive: boolean
      needsFreshStart: false
    }
  | {
      isVerified: false
      /** Tokens issued without setup finishing (an account transfer, or a failed finish step) */
      isDeviceVerifiedByIas: boolean
      isVerificationInProgress: boolean
      needsVerification: boolean
      isCardInactive: boolean
      /**
       * A registration cancelled or expired before setup finished: whatever progress it holds (a submitted
       * video, a request, evidence) belongs to a registration IAS no longer honours, so Start begins again
       * from nothing instead of resuming it
       */
      needsFreshStart: boolean
    }

/** The single definition of "verified", "device verified by IAS" and "needs verification". */
export const getVerificationState = (facts: VerificationFacts): VerificationState => {
  const { hasCredential, cardInactive, inVerifyFlow, hasRefreshToken } = facts

  // The store can hold a credential while in the verify flow; finishing setup ends the flow
  if (hasCredential) {
    return {
      isVerified: true,
      isDeviceVerifiedByIas: true,
      isVerificationInProgress: false,
      needsVerification: false,
      isCardInactive: cardInactive,
      needsFreshStart: false,
    }
  }

  return {
    isVerified: false,
    isVerificationInProgress: inVerifyFlow,
    isDeviceVerifiedByIas: hasRefreshToken && !cardInactive,
    needsVerification: !inVerifyFlow,
    isCardInactive: cardInactive,
    needsFreshStart: cardInactive,
  }
}
