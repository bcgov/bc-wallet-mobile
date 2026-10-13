import moment from 'moment'

/**
 * Parse a user-entered birthdate string ('YYYY-MM-DD' or 'YYYY/MM/DD') into a
 * Date pinned to LOCAL midnight on that calendar day. Avoids the JS gotcha where
 * `new Date('YYYY-MM-DD')` parses as UTC midnight and shifts to the previous day
 * when later formatted in any local TZ west of UTC.
 *
 * Callers must validate format before calling — returns Invalid Date for
 * unparseable input.
 */
export const parseBirthdateToLocalDate = (value: string): Date =>
  moment(value, ['YYYY-MM-DD', 'YYYY/MM/DD', 'MMMM D, YYYY'], true).toDate()

/**
 * Format a birthdate as the `YYYY-MM-DD` string IAS expects, using the Date's LOCAL calendar day.
 * Never use `toISOString()` here: it converts to UTC and shifts the day for non-UTC timezones.
 */
export const formatBirthdateForApi = (date: Date): string => moment(date).format('YYYY-MM-DD')
