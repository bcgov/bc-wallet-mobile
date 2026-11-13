import { BCSCAuthStackParams, BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { openLink } from '@/utils/links'
import { SafeAreaModal, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { setMaxDevicesBannerLastDisplayedDate } from 'react-native-bcsc-core'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { AppUpdate } from '../state/banners/app-update'
import { useAppUpdate } from '../state/banners/useAppUpdate'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'

/** The container renders on Home (MainStack) and account landing (AuthStack); both register this route. */
type ServiceNoticeParamList = Pick<BCSCMainStackParams & BCSCAuthStackParams, BCSCScreens.ServiceNotice>

interface NotificationBannerContainerProps {
  onManageDevices: () => void
  bannerMessages: BCSCBannerMessage[]
  excludedBannerIds?: BCSCBanner[]
}

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @param {NotificationBannerContainerProps} props - The properties for the NotificationBannerContainer component.
 * @returns {*} {React.ReactElement} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = ({
  onManageDevices,
  bannerMessages,
  excludedBannerIds,
}: NotificationBannerContainerProps) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<ServiceNoticeParamList>>()
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)
  const appUpdate = useAppUpdate()

  // NOTE: this function will be deprecated once all banners are migrated
  const handleBannerPress = async (banner: BCSCBannerMessage): Promise<void> => {
    const bannerId = banner.id
    // Handle other banner types as needed

    if (banner?.onPress) {
      return banner.onPress(bannerId)
    }

    if (banner.id === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      return setDevicesModalVisible(true)
    }

    if (banner.id === BCSCBanner.IAS_SERVER_NOTIFICATION) {
      return navigation.navigate(BCSCScreens.ServiceNotice)
    }

    if (banner.id === BCSCBanner.IAS_SERVER_UNAVAILABLE && typeof banner.metadata?.contactLink === 'string') {
      void openLink(banner.metadata.contactLink)
    }

    const message = store.bcsc.bannerMessages.find((banner) => banner.id === bannerId)
    // Only dismiss the banner if it is marked as dismissable
    if (message?.dismissible) {
      // Default action: remove the banner permanently on press
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [bannerId] })
    }
  }

  const appBanners = useMemo(() => {
    const bannerMessages: BCSCBannerMessage[] = []
    const excluded = new Set(excludedBannerIds ?? [])

    if (appUpdate === AppUpdate.Optional) {
      bannerMessages.push({
        id: BCSCBanner.APP_UPDATE_AVAILABLE,
        title: t('BCSC.SystemChecks.UpdateApp.UpdateAvailableBannerTitle'),
        type: 'info',
        dismissible: true,
      })
    }
    // Add other banner messages as needed, filtering out excluded banners
    return bannerMessages.filter((banner) => !excluded.has(banner.id))
  }, [appUpdate, excludedBannerIds, t])

  const handleCloseDevicesModal = useCallback(({ shouldAnimate }: { shouldAnimate: boolean }) => {
    devicesModalShouldAnimate.current = shouldAnimate
    setDevicesModalVisible(false)
  }, [])

  const handleDeleteDeviceCountMessage = useCallback(() => {
    dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED] })
    void setMaxDevicesBannerLastDisplayedDate(Date.now())
    handleCloseDevicesModal({ shouldAnimate: true })
  }, [dispatch, handleCloseDevicesModal])

  return (
    <View>
      <SafeAreaModal
        visible={devicesModalVisible}
        onRequestClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
        transparent={true}
        animationType={devicesModalShouldAnimate.current ? 'slide' : 'none'}
      >
        <ReviewDevices
          maxDevices={3}
          handleClose={() => handleCloseDevicesModal({ shouldAnimate: true })}
          handleDelete={handleDeleteDeviceCountMessage}
          onManageDevices={onManageDevices}
        />
      </SafeAreaModal>

      <AppBanner
        messages={[...appBanners, ...bannerMessages].map((banner) => ({
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
