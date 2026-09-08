import {
  formatExpiryBadge,
  formatTimestamp,
  getProofRequestExpiry,
  isAccountExpired,
  isAccountWithinWarningPeriod,
} from './datetime-utils'

const NOW = new Date('2026-06-04T12:00:00.000Z')
const minutes = (n: number) => n * 60_000
const hours = (n: number) => n * 3_600_000
const days = (n: number) => n * 86_400_000
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const ahead = (ms: number) => new Date(NOW.getTime() + ms)

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('formatTimestamp', () => {
  it('returns "Just now" for timestamps less than a minute old', () => {
    expect(formatTimestamp(ago(0))).toBe('Just now')
    expect(formatTimestamp(ago(30_000))).toBe('Just now')
    expect(formatTimestamp(ago(minutes(1) - 1))).toBe('Just now')
  })

  it('treats future timestamps as "Just now"', () => {
    expect(formatTimestamp(ahead(hours(3)))).toBe('Just now')
  })

  it('returns minutes ago for timestamps less than an hour old, rounded down', () => {
    expect(formatTimestamp(ago(minutes(1)))).toBe('1 minute ago')
    expect(formatTimestamp(ago(minutes(5) + 33_000))).toBe('5 minutes ago')
    expect(formatTimestamp(ago(minutes(59)))).toBe('59 minutes ago')
  })

  it('switches to a time of day at exactly one hour', () => {
    expect(formatTimestamp(ago(minutes(60)))).toMatch(/^\d{1,2}:\d{2}/)
  })

  it('returns a time of day for timestamps between an hour and a day old', () => {
    // Locale-dependent output (e.g. "9:00 AM"), so assert the shape rather than the exact string
    expect(formatTimestamp(ago(hours(3)))).toMatch(/^\d{1,2}:\d{2}/)
    expect(formatTimestamp(ago(hours(23)))).toMatch(/^\d{1,2}:\d{2}/)
    expect(formatTimestamp(ago(days(1) - 1))).toMatch(/^\d{1,2}:\d{2}/)
  })

  it('returns a date and time (no year) for timestamps a day or more old, within the year', () => {
    expect(formatTimestamp(ago(days(1)))).toMatch(/^Jun 3, \d{1,2}:\d{2}/)
    expect(formatTimestamp(ago(days(2)))).toMatch(/^Jun 2, \d{1,2}:\d{2}/)
  })

  it('keeps the year hidden at exactly one year old', () => {
    expect(formatTimestamp(ago(days(365)))).not.toMatch(/2025/)
  })

  it('includes the year for timestamps more than a year old', () => {
    expect(formatTimestamp(ago(days(366)))).toMatch(/2025/)
    expect(formatTimestamp(ago(days(400)))).toMatch(/2025/)
  })
})

describe('formatExpiryBadge', () => {
  it('returns "Expired" once the expiry time has passed', () => {
    expect(formatExpiryBadge(ago(hours(1)))).toBe('Expired')
    expect(formatExpiryBadge(ago(1))).toBe('Expired')
    expect(formatExpiryBadge(NOW)).toBe('Expired')
  })

  it('returns "less than a minute" for expiries under a minute away', () => {
    expect(formatExpiryBadge(ahead(1))).toBe('Expires in less than a minute')
    expect(formatExpiryBadge(ahead(30_000))).toBe('Expires in less than a minute')
    expect(formatExpiryBadge(ahead(minutes(1) - 1))).toBe('Expires in less than a minute')
  })

  it('returns minutes for expiries less than an hour away, rounded down', () => {
    expect(formatExpiryBadge(ahead(minutes(1)))).toBe('Expires in 1 minute')
    expect(formatExpiryBadge(ahead(minutes(5) + 33_000))).toBe('Expires in 5 minutes')
    expect(formatExpiryBadge(ahead(minutes(59)))).toBe('Expires in 59 minutes')
  })

  it('switches to a time of day at exactly one hour', () => {
    expect(formatExpiryBadge(ahead(minutes(60)))).toMatch(/^Expires at \d{1,2}:\d{2}/)
  })

  it('returns a time of day for expiries between an hour and a day away', () => {
    expect(formatExpiryBadge(ahead(hours(1)))).toMatch(/^Expires at \d{1,2}:\d{2}/)
    expect(formatExpiryBadge(ahead(hours(23)))).toMatch(/^Expires at \d{1,2}:\d{2}/)
    expect(formatExpiryBadge(ahead(days(1) - 1))).toMatch(/^Expires at \d{1,2}:\d{2}/)
  })

  it('returns a date and time (no year) for expiries a day or more away, within the year', () => {
    expect(formatExpiryBadge(ahead(days(1)))).toMatch(/^Expires Jun \d{1,2}, \d{1,2}:\d{2}/)
    expect(formatExpiryBadge(ahead(days(3)))).toMatch(/^Expires Jun \d{1,2}, \d{1,2}:\d{2}/)
  })

  it('keeps the year hidden at exactly one year away', () => {
    expect(formatExpiryBadge(ahead(days(365)))).not.toMatch(/2027/)
  })

  it('includes the year for expiries more than a year away', () => {
    expect(formatExpiryBadge(ahead(days(366)))).toMatch(/^Expires \w{3} \d{1,2}, 2027, \d{1,2}:\d{2}/)
  })
})

describe('getProofRequestExpiry', () => {
  const createdAt = new Date('2026-06-04T00:00:00.000Z')

  it('returns undefined when the TTL is 0 and there is no protocol expiry', () => {
    expect(getProofRequestExpiry(createdAt, 0)).toBeUndefined()
  })

  it('returns the protocol expiry when the TTL is 0', () => {
    const protocolExpiresTime = new Date('2026-06-05T00:00:00.000Z')
    expect(getProofRequestExpiry(createdAt, 0, protocolExpiresTime)).toEqual(protocolExpiresTime)
  })

  it('returns createdAt + TTL when there is no protocol expiry', () => {
    expect(getProofRequestExpiry(createdAt, hours(48))).toEqual(new Date('2026-06-06T00:00:00.000Z'))
  })

  it('returns the protocol expiry when it comes before the TTL removal time', () => {
    const protocolExpiresTime = new Date('2026-06-04T06:00:00.000Z')
    expect(getProofRequestExpiry(createdAt, hours(48), protocolExpiresTime)).toEqual(protocolExpiresTime)
  })

  it('returns the TTL removal time when it comes before the protocol expiry', () => {
    const protocolExpiresTime = new Date('2026-06-10T00:00:00.000Z')
    expect(getProofRequestExpiry(createdAt, hours(48), protocolExpiresTime)).toEqual(new Date('2026-06-06T00:00:00.000Z'))
  })

  it('ignores a negative TTL', () => {
    expect(getProofRequestExpiry(createdAt, -1)).toBeUndefined()
  })
})

describe('isAccountExpired', () => {
  it('treats a past date as expired', () => {
    expect(isAccountExpired(ago(days(1)))).toBe(true)
  })

  it('treats today as expired', () => {
    expect(isAccountExpired(NOW)).toBe(true)
  })

  it('treats a future date as not expired', () => {
    expect(isAccountExpired(ahead(days(1)))).toBe(false)
  })

  it('accepts a "MMMM D, YYYY" string in the past', () => {
    expect(isAccountExpired('January 1, 2020')).toBe(true)
  })

  it('accepts a "MMMM D, YYYY" string in the future', () => {
    expect(isAccountExpired('January 1, 2030')).toBe(false)
  })
})

describe('isAccountWithinWarningPeriod', () => {
  it('is true when the date is inside the warning window', () => {
    expect(isAccountWithinWarningPeriod(ahead(days(10)), 30)).toBe(true)
  })

  it('is true at exactly the edge of the warning window', () => {
    expect(isAccountWithinWarningPeriod(ahead(days(30)), 30)).toBe(true)
  })

  it('is false when the date is beyond the warning window', () => {
    expect(isAccountWithinWarningPeriod(ahead(days(40)), 30)).toBe(false)
  })

  it('is false once the date is today or has passed', () => {
    expect(isAccountWithinWarningPeriod(NOW, 30)).toBe(false)
    expect(isAccountWithinWarningPeriod(ago(days(1)), 30)).toBe(false)
  })

  it('accepts a "MMMM D, YYYY" string', () => {
    expect(isAccountWithinWarningPeriod('June 14, 2026', 30)).toBe(true)
    expect(isAccountWithinWarningPeriod('July 14, 2026', 30)).toBe(false)
  })
})
