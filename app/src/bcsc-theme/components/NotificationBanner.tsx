import { useMemo } from 'react'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'
import { useStore } from '@bifold/core'
import { BCState } from '@/store'

interface NotificationBannerProps {
  onPressBanner?: (bannerId: BCSCBanner) => void
}

/**
 * Component to display notification banners based on the BCSC state.
 *
 * @param {NotificationBannerProps} props - The component props.
 * @returns {*} {JSX.Element} The NotificationBanner component.
 */
export const NotificationBanner = ({ onPressBanner }: NotificationBannerProps) => {
  const [store] = useStore<BCState>()

  const bannerMessages: BCSCBannerMessage[] = useMemo(() => {
    return store.bcsc.bannerMessages.map((banner) => {
      return {
        id: banner.id,
        title: banner.title,
        type: banner.type,
        dismissible: banner.dismissible,
        onPress: () => onPressBanner?.(banner.id),
      }
    })
  }, [onPressBanner, store.bcsc.bannerMessages])

  return (
    <AppBanner messages={bannerMessages.map((banner) => ({ ...banner, onPress: () => onPressBanner?.(banner.id) }))} />
  )
}
