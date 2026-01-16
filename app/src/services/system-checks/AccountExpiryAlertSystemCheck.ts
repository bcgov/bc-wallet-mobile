import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { showAlert } from '@/utils/alert'
import { isAccountExpired } from './AccountExpiryWarningBannerSystemCheck'
import { SystemCheckNavigation, SystemCheckStrategy, SystemCheckUtils } from './system-checks'

// This will display a warning alert to the user (only once)

/**
 * Checks if the user's account has expired and displays an alert.
 * This alert will appear every time the user opens the app, and will route the user to renewal information.
 *
 * @warning This check isn't used currently as it is not part of v3 behavior. Finish implementation if needed in future.
 * @class AccountExpiryAlertSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpiryAlertSystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly navigation: SystemCheckNavigation
  private readonly utils: SystemCheckUtils

  constructor(accountExpiration: Date, navigation: SystemCheckNavigation, utils: SystemCheckUtils) {
    this.accountExpiration = accountExpiration
    // this.accountExpiration = moment().subtract(1, 'day').toDate() // For testing purposes only
    this.navigation = navigation
    this.utils = utils
  }

  runCheck() {
    return !isAccountExpired(this.accountExpiration)
  }

  onFail() {
    showAlert(
      this.utils.translation('BCSC.SystemChecks.AccountExpiryAlert.Title'),
      this.utils.translation('BCSC.SystemChecks.AccountExpiryAlert.Message'),
      [
        {
          text: this.utils.translation('BCSC.SystemChecks.AccountExpiryAlert.RenewalInfoButton'),
          onPress: () => {
            this.navigation.navigate(BCSCScreens.AccountRenewalInformation)
          },
        },
        {
          text: this.utils.translation('BCSC.SystemChecks.AccountExpiryAlert.DismissButton'),
          onPress: () => {
            // Do nothing
          },
        },
      ]
    )
  }

  onSuccess() {
    // Account is not expired
  }
}
