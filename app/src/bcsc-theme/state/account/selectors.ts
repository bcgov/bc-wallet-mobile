import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCState } from '@/store'
import { selectVerificationState } from '../verification/selectors'
import { AccountPhase, getAccountPhase } from './account-phase'
import { isRefreshTokenExpired } from './refresh-token'

/**
 * Reads the expiry rule's inputs from the store and the in-memory account.
 * `isVerified` and `isCardInactive` come from `selectVerificationState`, the one definition of each.
 */
export const selectAccountPhase = (state: BCState, account: BCSCAccount | null, now: Date): AccountPhase => {
  const { isVerified, isCardInactive } = selectVerificationState(state)

  return getAccountPhase(
    {
      isVerified,
      cardInactive: isCardInactive,
      credentialExpired: isRefreshTokenExpired(state.bcscSecure.refreshToken, now),
      cardExpiresAt: account?.account_expiration_date,
    },
    now
  )
}
