import { BCState, VerificationStatus } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'

/**
 * Returns the current user verification status derived from secure state.
 *
 * - `isVerified` — true if the user has a valid credential or refresh token
 * - `isVerificationInProgress` — true while the user is actively going through verification
 * - `isDeactivated` — true if the credential was cancelled or expired
 * - `needsVerification` — true when the user has not verified and is not currently doing so
 */
export const useVerificationStatus = () => {
  const [store] = useStore<BCState>()
  const { verified, verifiedStatus } = store.bcscSecure

  return useMemo(() => {
    const isVerified = Boolean(verified)
    const isVerificationInProgress = verifiedStatus === VerificationStatus.IN_PROGRESS
    const isDeactivated = verifiedStatus === VerificationStatus.DEACTIVATED

    return {
      isVerified,
      isVerificationInProgress,
      isDeactivated,
      needsVerification: !isVerified && !isVerificationInProgress,
    }
  }, [verified, verifiedStatus])
}
