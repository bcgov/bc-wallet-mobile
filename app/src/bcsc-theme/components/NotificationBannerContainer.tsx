import { SafeAreaModal } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
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
          maxDevices={3}
          handleClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
          onManageDevices={onManageDevices}
        />
      </SafeAreaModal>

      <NotificationBanner onPressBanner={handleBannerPress} />
    </View>
  )
}
