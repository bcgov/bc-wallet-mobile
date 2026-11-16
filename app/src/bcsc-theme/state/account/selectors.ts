import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { selectVerificationState } from '../verification/selectors'
import { AccountPhase, getAccountPhase } from './account-phase'
import { isRefreshTokenExpired } from './refresh-token'

/**
 * Reads the expiry rule's inputs from the store and the in-memory account.
 * `isVerified` comes from `selectVerificationState`, the one definition of "verified".
 */
export const selectAccountPhase = (state: BCState, account: BCSCAccount | null, now: Date): AccountPhase =>
  getAccountPhase(
    {
      isVerified: selectVerificationState(state).isVerified,
      expiredByServer: state.bcsc.credentialMetadata?.bcscReason === BCSCReason.ExpiredBySystem,
      credentialExpired: isRefreshTokenExpired(state.bcscSecure.refreshToken, now),
      cardExpiresAt: account?.account_expiration_date,
    },
    now
  )
