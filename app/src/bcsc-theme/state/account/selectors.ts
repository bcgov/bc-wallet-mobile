import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import type { BCSCStore } from '@/bcsc-theme/storage'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { selectVerificationState } from '../verification/selectors'
import { AccountPhase, getAccountPhase } from './account-phase'
import { isRefreshTokenExpired } from './refresh-token'

/**
 * Reads the expiry rule's inputs from the store and the in-memory account.
 * `isVerified` comes from `selectVerificationState`, the one definition of "verified".
 */
export const selectAccountPhase = (state: BCSCStore, account: BCSCAccount | null, now: Date): AccountPhase =>
  getAccountPhase(
    {
      isVerified: selectVerificationState(state).isVerified,
      expiredByServer: state.account.credentialMetadata?.bcscReason === BCSCReason.ExpiredBySystem,
      credentialExpired: isRefreshTokenExpired(state.account.tokens?.refreshToken, now),
      cardExpiresAt: account?.account_expiration_date,
    },
    now
  )
