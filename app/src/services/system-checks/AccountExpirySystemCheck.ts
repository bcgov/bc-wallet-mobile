import { BCDispatchAction } from '@/store'
import moment from 'moment'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

// This will display a warning banner to the user (only once)

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
export const isAccountExpired = (accountExpiration: Date | string, warningPeriod = 0): boolean => {
  const format = typeof accountExpiration === 'string' ? 'MMMM D, YYYY' : undefined
  return moment(accountExpiration, format).diff(moment(), 'days') <= warningPeriod
}

/**
 * Checks if the user's account is expired..
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
    const isExpired = isAccountExpired(this.accountExpiration, 0)
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
