import { BCSCBanner } from '@/bcsc-theme/types/banners'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useCallback, useMemo } from 'react'

/**
 * A custom hook that manages writing banners related state to the store
 *
 * @returns An object containing the banners writer functions
 */
export const useBannersWriter = () => {
  const [, dispatch] = useStore<BCState>()

  /**
   * Dismisses a banner message by dispatching an action to the store.
   *
   * @param bannerId - The ID of the banner message to dismiss.
   */
  const recordBannerDismissal = useCallback(
    (bannerId: BCSCBanner) => {
      dispatch({
        type: BCDispatchAction.DISMISS_BANNER,
        payload: [{ bannerId: bannerId }],
      })
    },
    [dispatch]
  )

  return useMemo(
    () => ({
      recordBannerDismissal,
    }),
    [recordBannerDismissal]
  )
}
