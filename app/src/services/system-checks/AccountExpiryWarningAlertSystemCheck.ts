import { ACCOUNT_EXPIRATION_WARNING_DAYS } from '@/constants'
import { BCDispatchAction } from '@/store'
import { showAlert } from '@/utils/alert'
import moment from 'moment'
import { isAccountExpired } from './AccountExpiryWarningBannerSystemCheck'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

// This will display a warning alert to the user (only once)

/**
 * Checks if the user's account is expiring soon (warning period) and display an alert.
 * The alert will appear while the expiration date is within the warning period, until it has been dismissed by the user.
 *
 *
 * @class AccountExpiryWarningAlertSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpiryWarningAlertSystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly utils: SystemCheckUtils
  private readonly hasDismissedAlert: boolean

  constructor(accountExpiration: Date, hasDismissedAlert: boolean, utils: SystemCheckUtils) {
    this.accountExpiration = accountExpiration
    this.hasDismissedAlert = hasDismissedAlert
    this.utils = utils
  }

  static isAccountExpired(accountExpiration: Date | string, warningPeriod = 0): boolean {
    const format = typeof accountExpiration === 'string' ? 'MMMM D, YYYY' : undefined
    return moment(accountExpiration, format).diff(moment(), 'days') <= warningPeriod
  }

  runCheck() {
    let showAlert = false

    // Don't show alert if it has already been dismissed
    if (!this.hasDismissedAlert) {
      showAlert = isAccountExpired(this.accountExpiration, ACCOUNT_EXPIRATION_WARNING_DAYS)
    }

    return showAlert
  }

  onFail() {
    // Account is not expiring soon
  }

  onSuccess() {
    // Account is expiring soon
    showAlert(
      'BC Services Card About to Expire',
      'Your mobile card is about to expire, go here to request an extension',
      [
        {
          text: 'OK',
          onPress: () => {
            // Dismissed alert, update store so it doesn't show again
            this.utils.dispatch({
              type: BCDispatchAction.DISMISSED_EXPIRY_ALERT,
              payload: [true],
            })
          },
        },
      ]
    )
  }
}
