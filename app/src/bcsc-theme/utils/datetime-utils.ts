import moment from 'moment'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS
const YEAR_MS = 365 * DAY_MS

/**
 * Formats date to time: 4:30 PM or 16:30 depending on locale
 *
 * @param {Date} date The timestamp to format
 * @return {*}  {string} formatted string output
 */
function clockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Formats date into string output: "Sep 25, 1:30 PM".
 * If `withYear` is set, string output: "Sep 25, 2015, 1:30 PM".
 *
 * @param {Date} date The timestamp to format
 * @param {boolean} withYear Whether to include the year
 * @return {*}  {string} formatted string output
 */
function calendarTime(date: Date, withYear: boolean): string {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format a timestamp for notification cards, using the following breakpoints:
 *
 * under a minute: "Just now"
 * 1–59 minutes: relative minutes, rounded down ("45 minutes ago")
 * 1–24 hours: clock time ("4:23 PM")
 * 1 Day up to a year: month, day, clock time ("Sep 25, 1:30 PM")
 * over a year: month, day, year, clock time ("Sep 25, 2015, 1:30 PM")
 *
 * @param {Date} date The timestamp to format
 * @return {*}  {string} formatted string output
 */
export function formatTimestamp(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / MINUTE_MS)

  if (diffMin < 1) {
    return 'Just now'
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  }
  if (diffMs < DAY_MS) {
    return clockTime(date)
  }
  return calendarTime(date, diffMs > YEAR_MS)
}

/**
 * Format an expiry time as a short badge label, using the same breakpoints as
 * {@link formatTimestamp} phrased as a forward-looking deadline:
 *
 * already passed: "Expired"
 * under a minute: "Expires in less than a minute"
 * 1–59 minutes: relative minutes, rounded down ("Expires in 45 minutes")
 * 1–24 hours: clock time ("Expires at 4:23 PM")
 * 1 Day up to a year: month, day, clock time ("Expires Sep 25, 1:30 PM")
 * over a year: month, day, year, clock time ("Expires Sep 25, 2027, 1:30 PM")
 *
 * @param {Date} expiresTime When the item expires
 * @return {*}  {string}
 */
export function formatExpiryBadge(expiresTime: Date): string {
  const diffMs = expiresTime.getTime() - Date.now()
  if (diffMs <= 0) {
    return 'Expired'
  }

  const diffMin = Math.floor(diffMs / MINUTE_MS)
  if (diffMin < 1) {
    return 'Expires in less than a minute'
  }
  if (diffMin < 60) {
    return `Expires in ${diffMin} minute${diffMin === 1 ? '' : 's'}`
  }
  if (diffMs < DAY_MS) {
    return `Expires at ${clockTime(expiresTime)}`
  }
  return `Expires ${calendarTime(expiresTime, diffMs > YEAR_MS)}`
}

/**
 * Return whichever comes first: the proof request's own expiry (`protocolExpiresTime`) or the
 * time the app drops it from the notification list (`createdAt` + the configured expiry time ).
 *
 * @param {Date} createdAt When the proof exchange record was created
 * @param {number} proofRequestExpirationMs App TTL in ms; 0 means no app-imposed expiry
 * @param {Date} [protocolExpiresTime] The proof request's own expiry, if it has one
 * @return {*}  {Date | undefined} The earlier of the two, or undefined if neither applies
 */
export function getProofRequestExpiry(
  createdAt: Date,
  proofRequestExpirationMs: number,
  protocolExpiresTime?: Date
): Date | undefined {
  const removalTime =
    proofRequestExpirationMs > 0 ? new Date(new Date(createdAt).getTime() + proofRequestExpirationMs) : undefined
  return [protocolExpiresTime, removalTime]
    .filter((d): d is Date => d !== undefined)
    .reduce((earliest: Date | undefined, d) => (!earliest || d < earliest ? d : earliest), undefined)
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
 * @param {Date | string} dateToCheck - The expiration date of the account. Strings must be formatted as 'MMMM D, YYYY' (e.g. 'January 1, 1970').
 * @param {number} warningPeriod - The number of days before expiration to start warning.
 * @returns {boolean} True if the account expires within the warning period but has not yet expired.
 */
export const isAccountWithinWarningPeriod = (dateToCheck: Date | string, warningPeriod: number): boolean => {
  const format = typeof dateToCheck === 'string' ? 'MMMM D, YYYY' : undefined
  // add startOf('day') to fix midnight calculation error
  const daysRemaining = moment(dateToCheck, format).startOf('day').diff(moment().startOf('day'), 'days')
  return 0 < daysRemaining && daysRemaining <= warningPeriod
}
