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

export interface VerificationState {
  /** Setup finished on this device */
  isVerified: boolean
  /** Tokens issued, whether or not setup finished (an account transfer, or a failed finish step) */
  isDeviceVerifiedByIas: boolean
  isVerificationInProgress: boolean
  isDeactivated: boolean
  needsVerification: boolean
}

/**
 * The single definition of "verified", "device verified by IAS" and "needs verification".
 * Flags rather than one status because the facts overlap: a deactivated credential can still be `isVerified`.
 */
export const getVerificationState = (facts: VerificationFacts): VerificationState => {
  const { hasCredential, credentialDeactivated, inVerifyFlow, hasRefreshToken } = facts

  return {
    isVerified: hasCredential,
    isDeviceVerifiedByIas: hasCredential || (hasRefreshToken && !credentialDeactivated),
    isVerificationInProgress: inVerifyFlow,
    isDeactivated: credentialDeactivated,
    needsVerification: !hasCredential && !inVerifyFlow,
  }
}
