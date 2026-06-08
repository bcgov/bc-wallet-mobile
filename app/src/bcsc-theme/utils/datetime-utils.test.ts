import { formatExpiryBadge, formatTimestamp } from './datetime-utils'

const NOW = new Date('2026-06-04T12:00:00.000Z')
const minutes = (n: number) => n * 60_000
const hours = (n: number) => n * 3_600_000
const days = (n: number) => n * 86_400_000

describe('formatTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Just now" for timestamps less than a minute old', () => {
    expect(formatTimestamp(new Date(NOW.getTime() - 30_000))).toBe('Just now')
  })

  it('returns minutes ago for timestamps less than an hour old', () => {
    expect(formatTimestamp(new Date(NOW.getTime() - minutes(1)))).toBe('1 minute ago')
    expect(formatTimestamp(new Date(NOW.getTime() - minutes(5)))).toBe('5 minutes ago')
    expect(formatTimestamp(new Date(NOW.getTime() - minutes(59)))).toBe('59 minutes ago')
  })

  it('returns a time of day for timestamps less than a day old', () => {
    // Locale-dependent output (e.g. "9:00 AM"), so assert the shape rather than the exact string
    expect(formatTimestamp(new Date(NOW.getTime() - hours(3)))).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns a date for timestamps a day or more old', () => {
    expect(formatTimestamp(new Date(NOW.getTime() - days(2)))).toMatch(/June 2/)
  })
})

describe('formatExpiryBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "Expired" once the expiry time has passed', () => {
    expect(formatExpiryBadge(new Date(NOW.getTime() - 1))).toBe('Expired')
    expect(formatExpiryBadge(NOW)).toBe('Expired')
  })

  it('returns minutes for expiries less than an hour away', () => {
    expect(formatExpiryBadge(new Date(NOW.getTime() + minutes(5)))).toBe('Expires in 5 min')
    expect(formatExpiryBadge(new Date(NOW.getTime() + minutes(59)))).toBe('Expires in 59 min')
  })

  it('returns hours for expiries less than a day away', () => {
    expect(formatExpiryBadge(new Date(NOW.getTime() + hours(1)))).toBe('Expires in 1 hour')
    expect(formatExpiryBadge(new Date(NOW.getTime() + hours(23)))).toBe('Expires in 23 hours')
  })

  it('returns days for expiries a day or more away', () => {
    expect(formatExpiryBadge(new Date(NOW.getTime() + days(1)))).toBe('Expires in 1 day')
    expect(formatExpiryBadge(new Date(NOW.getTime() + days(3)))).toBe('Expires in 3 days')
  })
})
