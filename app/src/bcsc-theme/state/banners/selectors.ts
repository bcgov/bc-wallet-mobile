import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCState } from '@/store'
import { BannerDismissal, getBannerDismissal } from './banner-dismissal'

/**
 * Selects whether the user's dismissal of a banner still applies, from the dismissals recorded in the store.
 * A banner with no recorded dismissal gives `BannerDismissal.NotDismissed`.
 *
 * @param state - The BCSC store state.
 * @param bannerId - The ID of the banner to check.
 * @returns - Whether the dismissal applies, see `getBannerDismissal`. Only `Dismissed` hides the banner.
 */
export const selectBannerDismissal = (state: BCState, bannerId: BCSCBanner): BannerDismissal => {
  const dismissals = state.bcsc.dismissedBanners || {}
  const dismissedBanner = dismissals[bannerId]

  return getBannerDismissal({
    now: Date.now(),
    dismissedAt: dismissedBanner?.dismissedAt ?? null,
    dismissedUntil: dismissedBanner?.dismissedUntil ?? null,
  })
}
