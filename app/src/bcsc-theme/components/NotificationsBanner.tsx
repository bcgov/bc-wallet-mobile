import { useMemo } from 'react'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { useStore } from '@bifold/core'
import { BCState } from '@/store'

/**
 * Component to display notification banners based on the BCSC state.
 * Injects banner actions mapped to their IDs to handle user interactions.
 *
 * @returns {*} {JSX.Element} The NotificationsBanner component.
 */
export const NotificationsBanner = () => {
  const [store] = useStore<BCState>()

  /**
   * Why is this needed?
   * The persistent storage is unable to store functions,
   * so we need to map banner IDs to their corresponding actions here.
   */
  const bannerActionsMap: Partial<Record<BCSCBanner, () => void>> = useMemo(
    () => ({
      [BCSCBanner.DEVICE_LIMIT_EXCEEDED]: () => {
        console.log('TODO: Device limit banner dismissed')
      },
    }),
    []
  )

  const bannerMessages: BCSCBannerMessage[] = useMemo(() => {
    return store.bcsc.bannerMessages.map((banner) => {
      return {
        id: banner.id,
        title: banner.title,
        type: banner.type,
        dismissible: banner.dismissible,
        onPress: () => {
          const onPressAction = bannerActionsMap[banner.id]

          if (!onPressAction) {
            // QUESTION (MD): Should we default to some action here? Like permanently deleting the banner?
            return
          }

          onPressAction()
        },
      }
    })
  }, [bannerActionsMap, store.bcsc.bannerMessages])

  return <AppBanner messages={bannerMessages} />
}
