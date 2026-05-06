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
  moment(value, ['YYYY-MM-DD', 'YYYY/MM/DD'], true).toDate()
