import { useMemo } from 'react'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'

export const NotificationBanner = () => {
  const [store] = useStore<BCState>()

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
            return
          }

          onPressAction()
        },
      }
    })
  }, [bannerActionsMap, store.bcsc.bannerMessages])
  return <AppBanner messages={bannerMessages} />
}
