import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { useAccount } from '../contexts/BCSCAccountContext'
import { BCSCReason } from '../utils/id-token'
import { isAccountExpired } from '../utils/datetime-utils'
import { useVerificationStatus } from './useVerificationStatus'

/**
 * Extends useVerificationStatus with card expiry awareness.
 *
 * - `isActivelyVerified` — true when the user is verified AND their card has not expired; use this for feature gating
 * - `isExpired` — true when the user has a verified card that has passed its expiry date
 * - Emergency mode (`bcscReason === ExpiredBySystem`) bypasses the date-based expiry check.
 *
 * Must be used within BCSCAccountProvider.
 */
export const useCardStatus = () => {
  const verificationStatus = useVerificationStatus()
  const { account } = useAccount()
  const [store] = useStore<BCState>()

  return useMemo(() => {
    const isEmergencyMode = store.bcsc.credentialMetadata?.bcscReason === BCSCReason.ExpiredBySystem
    const isExpired =
      !isEmergencyMode && verificationStatus.isVerified && account != null
        ? isAccountExpired(account.account_expiration_date)
        : false

    return {
      ...verificationStatus,
      isExpired,
      isEmergencyMode,
      isActivelyVerified: verificationStatus.isVerified && !isExpired,
    }
  }, [verificationStatus, account, store.bcsc.credentialMetadata?.bcscReason])
}
