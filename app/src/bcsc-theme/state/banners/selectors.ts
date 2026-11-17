import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { BannerDismissal, getBannerDismissal } from './banner-dismissal'

/**
 * Selects whether the user's dismissal of a banner still applies, from the dismissals recorded in the store.
 * A banner with no recorded dismissal gives `BannerDismissal.NotDismissed`.
 *
 * @param state - The BCSC store state.
 * @param bannerId - The ID of the banner to check.
 * @param now - The current time in milliseconds since the epoch, used to determine whether the dismissal has ended.
 * @returns - Whether the dismissal applies, see `getBannerDismissal`. Only `Dismissed` hides the banner.
 */
export const selectBannerDismissal = (state: BCState, bannerId: BCSCBanner, now: number): BannerDismissal => {
  const dismissals = state.bcsc.dismissedBanners || {}
  const dismissedBanner = dismissals[bannerId]

  return getBannerDismissal({
    now,
    bannerId,
    dismissedAt: dismissedBanner?.dismissedAt ?? null,
  })
}
