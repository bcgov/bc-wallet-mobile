import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { useAccount } from '../contexts/BCSCAccountContext'
import { isAccountExpired } from '../utils/datetime-utils'
import { BCSCReason } from '../utils/id-token'
import { useVerificationStatus } from './useVerificationStatus'

/**
 * Extends useVerificationStatus with card expiry awareness.
 *
 * - `isActivelyVerified` — true when the user is verified AND their card has not expired; use this for feature gating
 * - `isExpired` — true when the user has a verified card that IAS has expired server-side, or whose
 *   expiry date has passed
 *
 * Must be used within BCSCAccountProvider.
 */
export const useCardStatus = () => {
  const verificationStatus = useVerificationStatus()
  const { account } = useAccount()
  const [store] = useStore<BCState>()

  return useMemo(() => {
    const isExpiredByServer = store.bcsc.credentialMetadata?.bcscReason === BCSCReason.ExpiredBySystem
    const isExpired = verificationStatus.isVerified
      ? isExpiredByServer || (account != null && isAccountExpired(account.account_expiration_date))
      : false

    return {
      ...verificationStatus,
      isExpired,
      isActivelyVerified: verificationStatus.isVerified && !isExpired,
    }
  }, [verificationStatus, account, store.bcsc.credentialMetadata?.bcscReason])
}
