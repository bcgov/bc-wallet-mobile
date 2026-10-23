import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { AccountPhase, getAccountPhase } from '@/bcsc-theme/utils/account-phase'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'

/**
 * Reads the expiry rule's inputs from the store and the in-memory account.
 * `verified` is the same source `useVerificationStatus` uses.
 */
export const selectAccountPhase = (state: BCState, account: BCSCAccount | null, now: Date): AccountPhase =>
  getAccountPhase(
    {
      isVerified: Boolean(state.bcscSecure.verified),
      expiredByServer: state.bcsc.credentialMetadata?.bcscReason === BCSCReason.ExpiredBySystem,
      credentialExpired: state.bcscSecure.refreshTokenExpired === true,
      cardExpiresAt: account?.account_expiration_date,
    },
    now
  )
