import { TFunction } from 'i18next'

const SECOND_MS = 1000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE

/**
 * The time left on a PIN lock in words, such as "2 minutes 5 seconds". Rounds up to the next second
 * so it never reads zero while the lock still holds, and leaves out leading units that are zero.
 */
export const formatLockoutCountdown = (t: TFunction, remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / SECOND_MS))
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE

  const secondsText = t('BCSC.Lockout.Countdown.Seconds', { count: seconds })

  if (hours === 0 && minutes === 0) {
    return secondsText
  }

  const minutesText = t('BCSC.Lockout.Countdown.Minutes', { count: minutes })
  // The parts are already translated text, so they are not escaped a second time
  const interpolation = { escapeValue: false }

  if (hours === 0) {
    return t('BCSC.Lockout.Countdown.MinutesSeconds', { minutes: minutesText, seconds: secondsText, interpolation })
  }

  return t('BCSC.Lockout.Countdown.HoursMinutesSeconds', {
    hours: t('BCSC.Lockout.Countdown.Hours', { count: hours }),
    minutes: minutesText,
    seconds: secondsText,
    interpolation,
  })
}
