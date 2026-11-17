import { SafeAreaModal } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { BannersScope, useBanners } from '../hooks/useBanners'
import { useBannersWriter } from '../state/banners/useBannersWriter'
import { DeviceLimit } from '../state/devices/device-limit'
import { AppBanner, BCSCBanner } from './AppBanner'

const DEFAULT_MAX_DEVICES = 5

type NotificationBannerContainerProps =
  | {
      scope: BannersScope.Home
      onManageDevices: () => void
    }
  | {
      scope: BannersScope.Auth
      onManageDevices?: never
    }

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @param {NotificationBannerContainerProps} props - The properties for the NotificationBannerContainer component.
 * @returns {*} {React.ReactElement} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = ({ scope, onManageDevices }: NotificationBannerContainerProps) => {
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)
  const setDeviceLimitPress = useCallback(() => setDevicesModalVisible(true), [])
  const { recordBannerDismissal } = useBannersWriter()
  const { banners, metadata } = useBanners(
    scope === BannersScope.Home ? { scope, onDeviceLimitPress: setDeviceLimitPress } : { scope }
  )

  const handleCloseDevicesModal = useCallback(({ shouldAnimate }: { shouldAnimate: boolean }) => {
    devicesModalShouldAnimate.current = shouldAnimate
    setDevicesModalVisible(false)
  }, [])

  const handleDeleteDeviceCountMessage = useCallback(() => {
    recordBannerDismissal(BCSCBanner.DEVICE_LIMIT_EXCEEDED)
    handleCloseDevicesModal({ shouldAnimate: true })
  }, [handleCloseDevicesModal, recordBannerDismissal])

  return (
    <View>
      {metadata.deviceLimit.limit === DeviceLimit.Unknown || scope === BannersScope.Auth ? null : (
        <SafeAreaModal
          visible={devicesModalVisible}
          onRequestClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
          transparent={true}
          animationType={devicesModalShouldAnimate.current ? 'slide' : 'none'}
        >
          <ReviewDevices
            maxDevices={metadata.deviceLimit.deviceLimit || DEFAULT_MAX_DEVICES}
            handleClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
            handleDelete={handleDeleteDeviceCountMessage}
            onManageDevices={onManageDevices}
          />
        </SafeAreaModal>
      )}

      <AppBanner messages={banners} />
    </View>
  )
}
