import { useBCSCStore } from '@/bcsc-theme/storage'
import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { useCallback, useMemo } from 'react'

/**
 * A custom hook that manages writing banners related state to the store
 *
 * @returns An object containing the banners writer functions
 */
export const useBannersWriter = () => {
  const dismissBanner = useBCSCStore((s) => s.app.dismissBanner)

  /**
   * Dismisses a banner message, recording when it was dismissed.
   *
   * @param bannerId - The ID of the banner message to dismiss.
   * @returns void
   */
  const recordBannerDismissal = useCallback(
    (bannerId: BCSCBanner) => {
      void dismissBanner(bannerId)
    },
    [dismissBanner]
  )

  return useMemo(
    () => ({
      recordBannerDismissal,
    }),
    [recordBannerDismissal]
  )
}
