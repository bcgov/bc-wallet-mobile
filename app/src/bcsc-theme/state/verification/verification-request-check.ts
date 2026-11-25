/** What the store holds about a verification whose outcome IAS may not have told this device yet. */
export interface VerificationRequestCheckFacts {
  isVerified: boolean
  /** The ID of a submitted send-video request */
  verificationRequestId?: string
  /** The device authorization's codes, kept until IAS issues its tokens */
  deviceCode?: string
  userCode?: string
  /** When that device authorization lapses */
  deviceCodeExpiresAt?: Date
}

export enum VerificationRequestCheckType {
  /** Verified, or nothing is waiting on IAS: there is no outcome to ask for */
  None = 'None',
  /** A send-video request was submitted: the evidence API has its status */
  RequestStatus = 'RequestStatus',
  /** A device authorization with no submitted request (in person, live call): the token endpoint has its outcome */
  PendingRecovery = 'PendingRecovery',
}

export type VerificationRequestCheck =
  | { type: VerificationRequestCheckType.None }
  | { type: VerificationRequestCheckType.RequestStatus; verificationRequestId: string }
  | {
      type: VerificationRequestCheckType.PendingRecovery
      deviceCode: string
      userCode: string
      deviceCodeExpiresAt?: Date
    }

/**
 * The single definition of which check asks IAS for the outcome of an unfinished verification. A submitted
 * request wins over the device codes it was made with. A missing or empty value means there is nothing of
 * that kind to ask about.
 */
export const getVerificationRequestCheck = (facts: VerificationRequestCheckFacts): VerificationRequestCheck => {
  const { isVerified, verificationRequestId, deviceCode, userCode, deviceCodeExpiresAt } = facts

  if (isVerified) {
    return { type: VerificationRequestCheckType.None }
  }

  if (verificationRequestId) {
    return { type: VerificationRequestCheckType.RequestStatus, verificationRequestId }
  }

  if (deviceCode && userCode) {
    return { type: VerificationRequestCheckType.PendingRecovery, deviceCode, userCode, deviceCodeExpiresAt }
  }

  return { type: VerificationRequestCheckType.None }
}
