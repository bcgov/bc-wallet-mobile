import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks whether the stored refresh token has expired (#4654).
 *
 * The refresh token IAS issues at set-up is never rotated in production, so its `exp` claim is
 * effectively the device credential's 5-year lifetime. `hydrateSecureState` already checks this
 * locally and skips the refresh network call when expired (see `useSecureActions`); this check
 * surfaces that result at MAIN_STACK startup by routing the user to the existing account-renewal
 * screen instead of letting them hit a confusing "Problem with Account" error on the first bearer
 * request.
 *
 * Always pushed for verified users (not gated on the flag) so its pass/fail result is recorded in
 * the `[useSystemChecks]: Ran N system checks` log.
 *
 * @class RefreshTokenExpiredSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class RefreshTokenExpiredSystemCheck implements SystemCheckStrategy {
  private readonly refreshTokenExpired: boolean
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils

  constructor(refreshTokenExpired: boolean, navigation: SystemCheckNavigation, utils: SystemCheckUtils) {
    this.refreshTokenExpired = refreshTokenExpired
    this.navigation = navigation
    this.utils = utils
  }

  runCheck(): boolean {
    return !this.refreshTokenExpired
  }

  onFail() {
    this.utils.logger.warn('[RefreshTokenExpiredSystemCheck] stored refresh token expired; routing to account renewal')
    // Same Home card AccountExpirySystemCheck lights, so backing out of the screen still leaves a renew path
    this.utils.dispatch({ type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION, payload: [true] })
    this.navigation.navigate(BCSCScreens.ReverifyAccount, { isExpired: true })
  }
}
