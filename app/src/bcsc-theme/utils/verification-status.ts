import { VerificationRequestStatus } from '@/constants'

export const UNKNOWN_VERIFICATION_STATUS = 'unknown'

const knownStatuses = new Set<string>(Object.values(VerificationRequestStatus))

/**
 * IAS can return any string for `status`, despite the response type. An unknown status is never
 * stored; the token exchange decides instead.
 */
export const interpretVerificationStatus = (
  status: string | null | undefined
): VerificationRequestStatus | typeof UNKNOWN_VERIFICATION_STATUS =>
  status && knownStatuses.has(status) ? (status as VerificationRequestStatus) : UNKNOWN_VERIFICATION_STATUS
