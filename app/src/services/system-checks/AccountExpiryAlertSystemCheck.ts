import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { showAlert } from '@/utils/alert'
import moment from 'moment'
import { isAccountExpired } from './AccountExpiryWarningBannerSystemCheck'
import { SystemCheckNavigation, SystemCheckStrategy } from './system-checks'

// This will display a warning alert to the user (only once)

/**
 * Checks if the user's account has expired and displays an alert.
 * This alert will appear every time the user opens the app, and will route the user to renewal information.
 *
 *
 * @class AccountExpiryAlertSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpiryAlertSystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly navigation: SystemCheckNavigation

  constructor(accountExpiration: Date, navigation: SystemCheckNavigation) {
    this.accountExpiration = accountExpiration
    this.accountExpiration = moment().subtract(1, 'day').toDate() // For testing purposes only
    this.navigation = navigation
  }

  runCheck() {
    return isAccountExpired(this.accountExpiration)
  }

  onFail() {
    // Account is not expiring soon
  }

  onSuccess() {
    // Account is expiring soon
    showAlert(
      'BC Services Card has expired',
      'Your mobile card has expired, youll need to remove your card and reverify to continue using the app.',
      [
        {
          text: 'Renewal information',
          onPress: () => {
            this.navigation.navigate(BCSCScreens.AccountRenewalInformation)
          },
        },
        {
          text: 'Dismiss',
          onPress: () => {
            // Do nothing
          },
        },
      ]
    )
  }
}
