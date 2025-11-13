import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCDispatchAction } from '@/store'
import moment from 'moment'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

const ACCOUNT_EXPIRATION_WARNING_DAYS = 30

/**
 * Checks if the user's account is expired or close to expiration.
 *
 * @class AccountExpirySystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpirySystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly utils: SystemCheckUtils
  private daysUntilExpired: number = 0

  constructor(accountExpiration: Date, utils: SystemCheckUtils) {
    this.accountExpiration = accountExpiration
    this.utils = utils
  }

  runCheck() {
    this.daysUntilExpired = moment(this.accountExpiration).diff(moment(), 'days')

    // Return false if the account is expired or expiring soon
    return this.daysUntilExpired > ACCOUNT_EXPIRATION_WARNING_DAYS
  }

  onFail() {
    // Account is expired
    if (this.daysUntilExpired <= 0) {
      // TODO (MD): Handle account expired path
    }

    // Account is expiring soon
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.ACCOUNT_EXPIRING_SOON,
          title: this.utils.translation('BCSC.SystemChecks.AccountExpiry.ExpiringBannerTitle', {
            accountExpiration: moment(this.accountExpiration).format('LL'), // ie: January 1, 1970
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
