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

interface VerificationFlags {
  isVerificationInProgress: boolean
  isDeactivated: boolean
}

/**
 * Split on `isVerified` so the combinations the rule can't produce don't type-check. The other flags
 * stay booleans because they overlap: a cancelled or expired card is still verified.
 */
export type VerificationState =
  | (VerificationFlags & {
      /** Setup finished on this device */
      isVerified: true
      isDeviceVerifiedByIas: true
      needsVerification: false
    })
  | (VerificationFlags & {
      isVerified: false
      /** Tokens issued without setup finishing (an account transfer, or a failed finish step) */
      isDeviceVerifiedByIas: boolean
      needsVerification: boolean
    })

/** The single definition of "verified", "device verified by IAS" and "needs verification". */
export const getVerificationState = (facts: VerificationFacts): VerificationState => {
  const { hasCredential, credentialDeactivated, inVerifyFlow, hasRefreshToken } = facts
  const flags = { isVerificationInProgress: inVerifyFlow, isDeactivated: credentialDeactivated }

  if (hasCredential) {
    return { ...flags, isVerified: true, isDeviceVerifiedByIas: true, needsVerification: false }
  }

  return {
    ...flags,
    isVerified: false,
    isDeviceVerifiedByIas: hasRefreshToken && !credentialDeactivated,
    needsVerification: !inVerifyFlow,
  }
}
