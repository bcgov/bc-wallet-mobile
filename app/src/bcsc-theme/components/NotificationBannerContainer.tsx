import { useCallback, useRef, useState } from 'react'
import { BCSCBanner } from './AppBanner'
import { Linking, View } from 'react-native'
import { NotificationBanner } from './NotificationBanner'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { SafeAreaModal, useStore } from '@bifold/core'
import { BCDispatchAction, BCState } from '@/store'
import { getPlatformStoreUrl } from '@/utils/links'

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @returns {*} {JSX.Element} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = () => {
  const [, dispatch] = useStore<BCState>()
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)

  const handleBannerPress = (bannerId: BCSCBanner) => {
    // Handle other banner types as needed

    if (bannerId === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      return setDevicesModalVisible(true)
    }

    if (bannerId === BCSCBanner.APP_UPDATE_AVAILABLE) {
      Linking.openURL(getPlatformStoreUrl())
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
        />
      </SafeAreaModal>

      <NotificationBanner onPressBanner={handleBannerPress} />
    </View>
  )
}
