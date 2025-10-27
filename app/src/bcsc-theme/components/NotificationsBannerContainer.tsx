import { useCallback, useRef, useState } from 'react'
import { BCSCBanner } from './AppBanner'
import { View } from 'react-native'
import { NotificationsBanner } from './NotificationsBanner'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { SafeAreaModal } from '@bifold/core'

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @returns {*} {JSX.Element} The NotificationsBannerContainer component.
 */
export const NotificationsBannerContainer = () => {
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)

  const handleBannerPress = (bannerId: BCSCBanner) => {
    if (bannerId === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      setDevicesModalVisible(true)
    }

    // Handle other banner types as needed
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
          handleClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
        />
      </SafeAreaModal>

      <NotificationsBanner onPressBanner={handleBannerPress} />
    </View>
  )
}
