import { useStore } from '@bifold/core'
import { BCSCBanner } from '../components/AppBanner'
import { useMemo } from 'react'

type BannerId = BCSCBanner | string

interface BannerActionsMap {
  [key: BannerId]: () => Promise<void> | void
}

export const useBannerMessages = (bannerActionsMap: BannerActionsMap) => {
  const [store] = useStore()

  const bannerMessages = useMemo(() => {
    return store.preferences.bannerMessages.map((banner) => {
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
  }, [bannerActionsMap, store.preferences.bannerMessages])

  return { bannerMessages: bannerMessages }
}
