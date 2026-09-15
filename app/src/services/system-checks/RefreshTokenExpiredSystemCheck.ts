import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Routes a verified user to account renewal when hydration found the stored refresh token expired (#4654),
 * instead of letting the first bearer request surface a "Problem with Account" error.
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
