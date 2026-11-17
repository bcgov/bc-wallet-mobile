import { BCSCAuthStackParams, BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { openLink } from '@/utils/links'
import { SafeAreaModal, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { BannersScope, useBanners } from '../hooks/useBanners'
import { useBannersWriter } from '../state/banners/useBannersWriter'
import { DeviceLimit } from '../state/devices/device-limit'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'

const DEFAULT_MAX_DEVICES = 5

/** The container renders on Home (MainStack) and account landing (AuthStack); both register this route. */
type ServiceNoticeParamList = Pick<BCSCMainStackParams & BCSCAuthStackParams, BCSCScreens.ServiceNotice>

type NotificationBannerContainerProps =
  | {
      scope: BannersScope.Home
      bannerMessages: BCSCBannerMessage[]
      onManageDevices: () => void
    }
  | {
      scope: BannersScope.Auth
      bannerMessages: BCSCBannerMessage[]
      onManageDevices?: never
    }

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @param {NotificationBannerContainerProps} props - The properties for the NotificationBannerContainer component.
 * @returns {*} {React.ReactElement} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = ({
  scope,
  onManageDevices,
  bannerMessages,
}: NotificationBannerContainerProps) => {
  const [, dispatch] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<ServiceNoticeParamList>>()
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)
  const setDeviceLimitPress = useCallback(() => setDevicesModalVisible(true), [])
  const { recordBannerDismissal } = useBannersWriter()
  const { banners, metadata } = useBanners(
    scope === BannersScope.Home ? { scope, onDeviceLimitPress: setDeviceLimitPress } : { scope }
  )

  // NOTE: temp while migrating the banners to this new system
  const filteredBanners = useMemo(
    () =>
      bannerMessages.filter(
        (banner) => banner.id !== BCSCBanner.APP_UPDATE_AVAILABLE && banner.id !== BCSCBanner.DEVICE_LIMIT_EXCEEDED
      ),
    [bannerMessages]
  )

  const handleBannerPress = async (banner: BCSCBannerMessage): Promise<void> => {
    const bannerId = banner.id
    // Handle other banner types as needed

    if (banner.onPress) {
      return banner.onPress(bannerId)
    }

    if (banner.id === BCSCBanner.IAS_SERVER_NOTIFICATION) {
      return navigation.navigate(BCSCScreens.ServiceNotice)
    }

    if (banner.id === BCSCBanner.IAS_SERVER_UNAVAILABLE && typeof banner.metadata?.contactLink === 'string') {
      void openLink(banner.metadata.contactLink)
    }

    const message = filteredBanners.find((banner) => banner.id === bannerId)
    // Only dismiss the banner if it is marked as dismissable
    if (message?.dismissible) {
      // Default action: remove the banner permanently on press
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [bannerId] })
    }
  }

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

      <AppBanner
        messages={[...banners, ...filteredBanners].map((banner) => ({
          id: banner.id,
          title: banner.title,
          description: banner.description,
          type: banner.type,
          dismissible: banner.dismissible,
          onPress: () => handleBannerPress(banner),
        }))}
      />
    </View>
  )
}
