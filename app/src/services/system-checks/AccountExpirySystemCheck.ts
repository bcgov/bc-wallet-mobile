import { isAccountExpired } from '@/bcsc-theme/utils/datetime-utils'
import { BCDispatchAction } from '@/store'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

/**
 * Checks if the user's account is expired.
 * Adds a notification to the home screen to provide context and steps to renew the account
 *
 *
 * @class AccountExpirySystemCheck
 * @implements {SystemCheckStrategy}
 */
export class AccountExpirySystemCheck implements SystemCheckStrategy {
  private readonly accountExpiration: Date
  private readonly utils: SystemCheckUtils

  constructor(accountExpiration: Date, utils: SystemCheckUtils) {
    this.accountExpiration = accountExpiration
    this.utils = utils
  }

  runCheck() {
    const isExpired = isAccountExpired(this.accountExpiration)

    // Fail if expired (including already expired — expired case is also handled by MainStack)
    return !isExpired
  }

  onFail() {
    this.utils.dispatch({ type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION, payload: [true] })
  }

  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION, payload: [false] })
  }
}
