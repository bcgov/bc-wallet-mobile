import moment from 'moment'

/**
 * Format a timestamp in a user-friendly way (e.g., "Just now", "5 minutes ago", "3:45 PM",
 * "June 4, 3:45 PM"), as used by the home screen notification cards.
 *
 * @param {Date} date The timestamp to format
 * @return {*}  {string}
 */
export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) {
    return 'Just now'
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Format an expiry time as a short badge label counting down until the item expires
 * (e.g., "Expires in 5 min", "Expires in 3 hours", "Expired").
 *
 * @param {Date} expiresTime When the item expires
 * @return {*}  {string}
 */
export function formatExpiryBadge(expiresTime: Date): string {
  const diffMs = expiresTime.getTime() - Date.now()
  if (diffMs <= 0) {
    return 'Expired'
  }
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) {
    return `Expires in ${diffMin} min`
  }
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

/**
 * Determines if the provided date is expired (expiration date is today or in the past).
 * A diff of 0 (expires today) is considered expired.
 *
 * @param {Date | string} dateToCheck - The expiration date. Strings must be formatted as 'MMMM D, YYYY' (e.g. 'January 1, 1970').
 * @returns {boolean} True if the expiration date is today or has passed, false otherwise.
 *
 */
export const isAccountExpired = (dateToCheck: Date | string): boolean => {
  const format = typeof dateToCheck === 'string' ? 'MMMM D, YYYY' : undefined
  // add startOf('day') to fix midnight calculation error
  return moment(dateToCheck, format).startOf('day').diff(moment().startOf('day'), 'days') <= 0
}

/**
 * Determines if the account is within the renewal warning window — expiring soon but not yet expired.
 *
 * @example
 *   10 days remaining, 30 day warning period => true
 *   40 days remaining, 30 day warning period => false
 *   0 days remaining (expires today), 30 day warning period => false
 *   -1 days remaining (expired yesterday), 30 day warning period => false
 *
 * @param {Date} expiration - The expiration date of the account.
 * @param {number} warningPeriod - The number of days before expiration to start warning.
 * @returns {boolean} True if the account expires within the warning period but has not yet expired.
 */
export const isAccountWithinWarningPeriod = (expiration: Date, warningPeriod: number): boolean => {
  // add startOf('day') to fix midnight calculation error
  const daysRemaining = moment(expiration).startOf('day').diff(moment().startOf('day'), 'days')
  return 0 < daysRemaining && daysRemaining <= warningPeriod
}
