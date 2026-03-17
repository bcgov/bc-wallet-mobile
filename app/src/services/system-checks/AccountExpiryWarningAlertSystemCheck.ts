import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ACCOUNT_EXPIRATION_WARNING_DAYS } from '@/constants'
import { BCDispatchAction } from '@/store'
import { showAlert } from '@/utils/alert'
import moment from 'moment'
import { isAccountExpired } from './AccountExpiryWarningBannerSystemCheck'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the user's account is expiring soon (warning period) and display an alert.
 * The alert will appear while the expiration date is within the warning period, until it has been dismissed by the user.
 * @warning This check isn't used currently as it is not part of v3 behavior. Finish implementation if needed in future.
 * @class AccountExpiryWarningAlertSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpiryWarningAlertSystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly utils: SystemCheckUtils
  private readonly hasDismissedAlert: boolean
  private readonly navigation: SystemCheckNavigation

  constructor(
    accountExpiration: Date,
    hasDismissedAlert: boolean,
    utils: SystemCheckUtils,
    navigation: SystemCheckNavigation
  ) {
    this.accountExpiration = accountExpiration
    this.hasDismissedAlert = hasDismissedAlert
    this.utils = utils
    this.navigation = navigation
  }

  static isAccountExpired(accountExpiration: Date | string, warningPeriod = 0): boolean {
    const format = typeof accountExpiration === 'string' ? 'MMMM D, YYYY' : undefined
    return moment(accountExpiration, format).diff(moment(), 'days') <= warningPeriod
  }

  runCheck() {
    // Don't show alert if it has already been dismissed
    if (!this.hasDismissedAlert) {
      return !isAccountExpired(this.accountExpiration, ACCOUNT_EXPIRATION_WARNING_DAYS)
    }

    return true
  }

  onFail() {
    // Account is expiring soon and alert hasn't been dismissed
    showAlert(
      this.utils.translation('BCSC.SystemChecks.AccountExpiryWarningAlert.Title'),
      this.utils.translation('BCSC.SystemChecks.AccountExpiryWarningAlert.Message'),
      [
        {
          text: this.utils.translation('BCSC.SystemChecks.AccountExpiryWarningAlert.RenewalInfoButton'),
          onPress: () => {
            // Dismissed alert, update store so it doesn't show again
            this.utils.dispatch({
              type: BCDispatchAction.DISMISSED_EXPIRY_ALERT,
              payload: [true],
            })

            this.navigation.navigate(BCSCScreens.AccountRenewalInformation)
          },
        },
      ]
    )
  }

  onSuccess() {
    // Do nothing, account is not expiring soon
  }
}
