/** What the server or device told us; the rule below is the only place that turns these into conclusions. */
export interface VerificationFacts {
  /** The native credential record is present and active: setup finished on this device */
  hasCredential: boolean
  /** The credential was cancelled or expired */
  credentialDeactivated: boolean
  /** The user is in the verify flow this session */
  inVerifyFlow: boolean
  /** IAS has issued this device a refresh token */
  hasRefreshToken: boolean
}

/**
 * Split on `isVerified` so the combinations the rule can't produce don't type-check. `isDeactivated`
 * stays a boolean on both sides: a cancelled or expired card is still verified.
 */
export type VerificationState =
  | {
      /** Setup finished on this device */
      isVerified: true
      isDeviceVerifiedByIas: true
      isVerificationInProgress: false
      needsVerification: false
      isDeactivated: boolean
    }
  | {
      isVerified: false
      /** Tokens issued without setup finishing (an account transfer, or a failed finish step) */
      isDeviceVerifiedByIas: boolean
      isVerificationInProgress: boolean
      needsVerification: boolean
      isDeactivated: boolean
    }

/** The single definition of "verified", "device verified by IAS" and "needs verification". */
export const getVerificationState = (facts: VerificationFacts): VerificationState => {
  const { hasCredential, credentialDeactivated, inVerifyFlow, hasRefreshToken } = facts

  // The store can hold a credential while in the verify flow; finishing setup ends the flow
  if (hasCredential) {
    return {
      isVerified: true,
      isDeviceVerifiedByIas: true,
      isVerificationInProgress: false,
      needsVerification: false,
      isDeactivated: credentialDeactivated,
    }
  }

  return {
    isVerified: false,
    isVerificationInProgress: inVerifyFlow,
    isDeviceVerifiedByIas: hasRefreshToken && !credentialDeactivated,
    needsVerification: !inVerifyFlow,
    isDeactivated: credentialDeactivated,
  }
}
