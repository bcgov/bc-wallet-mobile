import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction } from '@/store'
import moment from 'moment'
import { SystemCheckNavigationUtils, SystemCheckStrategy } from './system-checks'

const ACCOUNT_EXPIRATION_WARNING_DAYS = 30

interface Account {
  firstName: string
  lastName: string
  expirationDate: Date
}

/**
 * Checks if the user's account is expired or close to expiration.
 *
 * @class AccountExpirySystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpirySystemCheck implements SystemCheckStrategy {
  private readonly account: Account
  private readonly utils: SystemCheckNavigationUtils
  private daysUntilExpired: number = 0

  constructor(account: Account, utils: SystemCheckNavigationUtils) {
    this.account = account
    this.utils = utils
  }

  runCheck() {
    this.daysUntilExpired = moment(this.account.expirationDate).diff(moment(), 'days')

    // Return false if the account is expired or expiring soon
    return this.daysUntilExpired > ACCOUNT_EXPIRATION_WARNING_DAYS
  }

  onFail() {
    // Account is expired
    if (this.daysUntilExpired <= 0) {
      this.utils.navigation.navigate(BCSCScreens.AccountExpired, {
        accountName: `${this.account.lastName}, ${this.account.firstName}`,
        accountExpiration: moment(this.account.expirationDate).format('LL'),
      })
    }

    // Account is expiring soon
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.ACCOUNT_EXPIRING_SOON,
          title: this.utils.translation('Unified.SystemChecks.AccountExpiry.ExpiringBannerTitle', {
            accountExpiration: moment(this.account.expirationDate).format('LL'), // ie: January 1, 1970
          }),
          type: 'warning',
          varaint: 'summary',
          dismissible: true,
        },
      ],
    })
  }

  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.ACCOUNT_EXPIRING_SOON] })
  }
}
