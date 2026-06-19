import { isAccountWithinWarningPeriod } from '@/bcsc-theme/utils/datetime-utils'
import { ACCOUNT_EXPIRATION_WARNING_DAYS } from '@/constants'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

// This will display a warning banner to the user (only once)

/**
 * Checks if the user's account is expiring soon (warning period), but not yet expired.
 * Informs the user when their BC Services card expires, and links user to renewal information.
 *
 *
 * @class AccountRenewalSystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountRenewalSystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly utils: SystemCheckUtils

  constructor(accountExpiration: Date, utils: SystemCheckUtils) {
    this.accountExpiration = accountExpiration
    this.utils = utils
  }

  runCheck() {
    const isExpiringSoon = isAccountWithinWarningPeriod(this.accountExpiration, ACCOUNT_EXPIRATION_WARNING_DAYS)
    return !isExpiringSoon
  }

  onFail() {
    this.utils.dispatch({ type: BCDispatchAction.SET_CARD_RENEWAL_NOTIFICATION, payload: [true] })
  }

  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.SET_CARD_RENEWAL_NOTIFICATION, payload: [false] })
  }
}
