import { parseRetryAfter } from './retry-after'

describe('parseRetryAfter', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')

  it.each([
    ['600', '2026-01-01T00:10:00.000Z'],
    ['  600  ', '2026-01-01T00:10:00.000Z'],
    ['0060', '2026-01-01T00:01:00.000Z'],
    ['1', '2026-01-01T00:00:01.000Z'],
  ])('reads %p as delay-seconds', (value, expected) => {
    expect(parseRetryAfter(value, now)?.toISOString()).toBe(expected)
  })

  it.each([
    ['zero', '0'],
    ['negative', '-9999'],
    ['decimal', '1.5'],
    ['text', 'soon'],
    ['empty', ''],
    ['blank', '   '],
    ['HTTP-date', 'Wed, 21 Oct 2099 07:28:00 GMT'],
    ['overflowing digits', '9'.repeat(400)],
    ['too large for a Date', '9'.repeat(20)],
    ['undefined', undefined],
    ['null', null],
    ['a number', 600],
    ['an array', ['600']],
  ])('rejects %s', (_label, value) => {
    expect(parseRetryAfter(value, now)).toBeNull()
  })
})
