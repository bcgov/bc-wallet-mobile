import { formatBirthdateForApi, parseBirthdateToLocalDate } from './birthdate'

describe('parseBirthdateToLocalDate', () => {
  // Asserting local Date components keeps these assertions TZ-invariant —
  // they hold whether Jest runs under TZ=GMT (CI default) or a real local TZ.
  // The bug being guarded against (issue #3798) is `new Date('YYYY-MM-DD')`
  // parsing as UTC midnight, which would yield getDate()/getHours() differing
  // from the entered values when the host is west of UTC.
  const assertLocalMidnight = (d: Date, year: number, monthIndex: number, day: number) => {
    expect(d.getFullYear()).toBe(year)
    expect(d.getMonth()).toBe(monthIndex)
    expect(d.getDate()).toBe(day)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  }

  it('parses YYYY-MM-DD as local midnight', () => {
    assertLocalMidnight(parseBirthdateToLocalDate('2000-01-01'), 2000, 0, 1)
  })

  it('parses YYYY/MM/DD as local midnight', () => {
    assertLocalMidnight(parseBirthdateToLocalDate('2000/01/01'), 2000, 0, 1)
  })

  it('parses MMMM D, YYYY as local midnight', () => {
    assertLocalMidnight(parseBirthdateToLocalDate('January 1, 2000'), 2000, 0, 1)
  })

  it('handles leap-day input', () => {
    assertLocalMidnight(parseBirthdateToLocalDate('2000-02-29'), 2000, 1, 29)
  })

  it('returns Invalid Date for unparseable input (strict mode)', () => {
    expect(Number.isNaN(parseBirthdateToLocalDate('not-a-date').getTime())).toBe(true)
    expect(Number.isNaN(parseBirthdateToLocalDate('2000-13-01').getTime())).toBe(true)
  })
})

describe('formatBirthdateForApi', () => {
  // Dates are built from local components so these hold under any TZ.
  it('zero-pads a local-midnight date', () => {
    expect(formatBirthdateForApi(new Date(2000, 0, 5))).toBe('2000-01-05')
  })

  it('keeps a late-evening local time on the same calendar day', () => {
    expect(formatBirthdateForApi(new Date(2000, 0, 1, 23, 59, 59))).toBe('2000-01-01')
  })

  it('formats a leap day', () => {
    expect(formatBirthdateForApi(new Date(2000, 1, 29))).toBe('2000-02-29')
  })

  it.each([
    ['1995-12-17', '1995-12-17'],
    ['2000-02-29', '2000-02-29'],
    ['2000/01/05', '2000-01-05'],
    ['January 1, 2000', '2000-01-01'],
  ])('round-trips %s through parseBirthdateToLocalDate', (input, expected) => {
    expect(formatBirthdateForApi(parseBirthdateToLocalDate(input))).toBe(expected)
  })
})
