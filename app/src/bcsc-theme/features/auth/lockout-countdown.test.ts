import en from '@/localization/en'
import i18next, { i18n, TFunction } from 'i18next'
import { formatLockoutCountdown } from './lockout-countdown'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

// The shared react-i18next mock returns keys, so the wording is checked against the real English text
const createEnglish = async (): Promise<i18n> => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    showSupportNotice: false,
  })
  return instance
}

describe('formatLockoutCountdown', () => {
  let t: TFunction

  beforeAll(async () => {
    t = (await createEnglish()).t
  })

  it.each([
    [SECOND, '1 second'],
    [45 * SECOND, '45 seconds'],
    [59 * SECOND, '59 seconds'],
    [MINUTE, '1 minute 0 seconds'],
    [MINUTE + SECOND, '1 minute 1 second'],
    [10 * MINUTE, '10 minutes 0 seconds'],
    [59 * MINUTE + 59 * SECOND, '59 minutes 59 seconds'],
    [HOUR, '1 hour 0 minutes 0 seconds'],
    [HOUR + MINUTE + SECOND, '1 hour 1 minute 1 second'],
    [23 * HOUR + 59 * MINUTE + 59 * SECOND, '23 hours 59 minutes 59 seconds'],
    [24 * HOUR, '24 hours 0 minutes 0 seconds'],
  ])('writes %i ms as "%s"', (remainingMs, expected) => {
    expect(formatLockoutCountdown(t, remainingMs)).toBe(expected)
  })

  it('rounds up to the next second, so a lock that still holds never reads zero', () => {
    expect(formatLockoutCountdown(t, 1)).toBe('1 second')
    expect(formatLockoutCountdown(t, SECOND + 1)).toBe('2 seconds')
    expect(formatLockoutCountdown(t, MINUTE - 1)).toBe('1 minute 0 seconds')
  })

  it('reads zero seconds once no time is left', () => {
    expect(formatLockoutCountdown(t, 0)).toBe('0 seconds')
    expect(formatLockoutCountdown(t, -5 * SECOND)).toBe('0 seconds')
  })

  it('still picks singular and plural on a JS engine without Intl.PluralRules', async () => {
    const pluralRules = Object.getOwnPropertyDescriptor(Intl, 'PluralRules') as PropertyDescriptor
    Object.defineProperty(Intl, 'PluralRules', { ...pluralRules, value: undefined })

    try {
      const { t: tWithoutPluralRules } = await createEnglish()

      expect(formatLockoutCountdown(tWithoutPluralRules, HOUR + MINUTE + SECOND)).toBe('1 hour 1 minute 1 second')
      expect(formatLockoutCountdown(tWithoutPluralRules, 2 * HOUR + 2 * MINUTE + 2 * SECOND)).toBe(
        '2 hours 2 minutes 2 seconds'
      )
    } finally {
      Object.defineProperty(Intl, 'PluralRules', pluralRules)
    }
  })
})
