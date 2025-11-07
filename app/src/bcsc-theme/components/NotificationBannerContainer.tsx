import { BCDispatchAction, BCState } from '@/store'
import { getBCSCAppStoreUrl } from '@/utils/links'
import { SafeAreaModal, useStore } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { BCSCBanner } from './AppBanner'
import { NotificationBanner } from './NotificationBanner'

interface NotificationBannerContainerProps {
  onManageDevices: () => void
}

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @param {NotificationBannerContainerProps} props - The properties for the NotificationBannerContainer component.
 * @returns {*} {JSX.Element} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = ({ onManageDevices }: NotificationBannerContainerProps) => {
  const [, dispatch] = useStore<BCState>()
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)

  const handleBannerPress = (bannerId: BCSCBanner) => {
    // Handle other banner types as needed

    if (bannerId === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      return setDevicesModalVisible(true)
    }

    if (bannerId === BCSCBanner.APP_UPDATE_AVAILABLE) {
      Linking.openURL(getBCSCAppStoreUrl())
    }

    // Default action: remove the banner permanently on press
    dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [bannerId] })
  }

  const handleCloseDevicesModal = useCallback(({ shouldAnimate }: { shouldAnimate: boolean }) => {
    devicesModalShouldAnimate.current = shouldAnimate
    setDevicesModalVisible(false)
  }, [])

  return (
    <View>
      <SafeAreaModal
        visible={devicesModalVisible}
        onRequestClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
        transparent={true}
        animationType={devicesModalShouldAnimate.current ? 'slide' : 'none'}
      >
        <ReviewDevices
          bannerId={BCSCBanner.DEVICE_LIMIT_EXCEEDED}
          maxDevices={3}
          handleClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
          onManageDevices={onManageDevices}
        />
      </SafeAreaModal>

      <NotificationBanner onPressBanner={handleBannerPress} />
    </View>
  )
}
