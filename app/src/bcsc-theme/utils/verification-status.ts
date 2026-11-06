import { VerificationRequestStatus } from '@/constants'

export const UNKNOWN_VERIFICATION_STATUS = 'unknown'

/**
 * IAS can return any string for `status`, despite the response type. An unknown status is never
 * stored; the token exchange decides instead.
 */
export const interpretVerificationStatus = (
  status: string | null | undefined
): VerificationRequestStatus | typeof UNKNOWN_VERIFICATION_STATUS =>
  status && (Object.values(VerificationRequestStatus) as string[]).includes(status)
    ? (status as VerificationRequestStatus)
    : UNKNOWN_VERIFICATION_STATUS
