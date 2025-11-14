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

  /**
   * Determines if the account is expired, or within the warning period.
   *
   * @example `
   *   10 days until expiration, 30 day warning period => true
   *   40 days until expiration, 30 day warning period => false
   *   0 days until expiration, 30 day warning period => true
   *  `
   * @param {Date | string} accountExpiration - The expiration date of the account. ie: 'January 1, 1970' or Date object
   * @param {number} warningPeriod - The number of days before expiration to start warning.
   * @returns {*} {boolean} - True if the account is expired or within the warning period, false otherwise.
   */
  static isAccountExpired(accountExpiration: Date | string, warningPeriod = 0): boolean {
    const accountExpirationMoment =
      typeof accountExpiration === 'string' ? moment(accountExpiration, 'MMMM D, YYYY') : moment(accountExpiration)
    const daysUntilExpired = accountExpirationMoment.diff(moment(), 'days')
    return daysUntilExpired <= warningPeriod
  }

  runCheck() {
    // Return false if the account is expired or expiring soon
    return !AccountExpirySystemCheck.isAccountExpired(this.accountExpiration, ACCOUNT_EXPIRATION_WARNING_DAYS)
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
