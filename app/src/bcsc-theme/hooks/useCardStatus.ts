import { useMemo } from 'react'
import { useAccountPhase } from './useAccountPhase'
import { useVerificationStatus } from './useVerificationStatus'

/**
 * Extends useVerificationStatus with card expiry awareness.
 *
 * - `isActivelyVerified` — true when the user is verified AND their card has not expired; use this for feature gating
 * - `isExpired` — true when the user has a verified card that IAS has expired server-side, whose expiry
 *   date has passed, or whose stored refresh token has expired (#4654 — true even with no `account` loaded)
 *
 * Must be used within BCSCAccountProvider.
 */
export const useCardStatus = () => {
  const verificationStatus = useVerificationStatus()
  const { phase } = useAccountPhase()

  return useMemo(() => {
    const isExpired = phase === 'expired'

    return {
      ...verificationStatus,
      isExpired,
      isActivelyVerified: verificationStatus.isVerified && !isExpired,
    }
  }, [verificationStatus, phase])
}
