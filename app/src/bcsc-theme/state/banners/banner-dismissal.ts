import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { DEVICE_COUNT_BANNER_COOLDOWN_MS_DEV, DEVICE_COUNT_BANNER_COOLDOWN_MS_PROD } from '@/constants'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const TEMP_NOT_DISMISSIBLE = 0 // TEMP: Used while refactoring banners (prevents permanent dismissal)
const DEVICE_LIMIT_BANNER_COOLDOWN_MS = __DEV__
  ? DEVICE_COUNT_BANNER_COOLDOWN_MS_DEV // 30 mins
  : DEVICE_COUNT_BANNER_COOLDOWN_MS_PROD // 30 days

/**
 * How long a banner stays hidden after the user dismisses it, in milliseconds. Every banner must be listed.
 *   - A number: the banner is hidden for that long, then shows again. `0` ends the dismissal immediately.
 *   - `Infinity`: the banner stays hidden until the dismissal is cleared (never reappears on its own).
 *     Use it only on purpose, since nothing resets it but a factory reset or an explicit clear.
 */
export const BANNER_DISMISS_DURATION_MS: Record<BCSCBanner, number> = {
  [BCSCBanner.APP_UPDATE_AVAILABLE]: ONE_DAY_MS,
  [BCSCBanner.IAS_SERVER_UNAVAILABLE]: TEMP_NOT_DISMISSIBLE,
  [BCSCBanner.IAS_SERVER_NOTIFICATION]: TEMP_NOT_DISMISSIBLE,
  [BCSCBanner.DEVICE_LIMIT_EXCEEDED]: DEVICE_LIMIT_BANNER_COOLDOWN_MS,
  [BCSCBanner.LIVE_CALL_STATUS]: TEMP_NOT_DISMISSIBLE,
}

export enum BannerDismissal {
  Dismissed = 'dismissed',
  NotDismissed = 'not_dismissed',
  DismissalEnded = 'dismissal_ended',
}

interface BannerDismissalFacts {
  now: number
  bannerId: BCSCBanner
  dismissedAt: number | null
}
/**
 * Determines whether the user's dismissal of a banner still applies, checked in order:
 *   1. `NotDismissed` when no dismissal is recorded.
 *   2. `Dismissed` when the dismissal has no end date.
 *   3. `DismissalEnded` when the dismissal has ended.
 *   4. `Dismissed` while the dismissal is still in effect.
 *
 * @param facts - The current time and the recorded `dismissedAt` and `bannerId`.
 * @returns - Whether the dismissal applies. Only `Dismissed` hides the banner.
 */
export const getBannerDismissal = (facts: BannerDismissalFacts): BannerDismissal => {
  // 1. Not applicable: nothing was ever dismissed
  if (facts.dismissedAt === null) {
    return BannerDismissal.NotDismissed
  }

  const dismissDuration = BANNER_DISMISS_DURATION_MS[facts.bannerId]

  // 2. Not applicable: no dismissal duration is defined for this banner
  if (dismissDuration === 0 || dismissDuration === undefined) {
    return BannerDismissal.NotDismissed
  }

  // 3. Not trusted: the dismissal was recorded in the future or the dismissal time is not a finite number
  if (!Number.isFinite(facts.dismissedAt) || facts.now < facts.dismissedAt) {
    return BannerDismissal.DismissalEnded
  }

  // 4. Dismissal has ended
  if (facts.now >= facts.dismissedAt + dismissDuration) {
    return BannerDismissal.DismissalEnded
  }

  // 5. Still inside the dismissal window
  return BannerDismissal.Dismissed
}
