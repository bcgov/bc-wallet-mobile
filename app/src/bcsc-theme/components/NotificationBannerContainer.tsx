import { BCDispatchAction, BCState } from '@/store'
import { openLink } from '@/utils/links'
import { SafeAreaModal, TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
import { setMaxDevicesBannerLastDisplayedDate } from 'react-native-bcsc-core'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { BCSCMainStackParams, BCSCScreens } from '../types/navigators'
import { AppBanner, BCSCBanner, BCSCBannerMessage } from './AppBanner'

interface NotificationBannerContainerProps {
  onManageDevices: () => void
  excludeBanners?: BCSCBanner[]
}

/**
 * Container component for displaying notification banners and handling their interactions.
 *
 * @param {NotificationBannerContainerProps} props - The properties for the NotificationBannerContainer component.
 * @returns {*} {React.ReactElement} The NotificationBannerContainer component.
 */
export const NotificationBannerContainer = ({ onManageDevices, excludeBanners }: NotificationBannerContainerProps) => {
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

  const handleBannerPress = async (banner: BCSCBannerMessage): Promise<void> => {
    const bannerId = banner.id
    // Handle other banner types as needed

    if (banner.id === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      return setDevicesModalVisible(true)
    }

    if (banner.id === BCSCBanner.ACCOUNT_EXPIRING_SOON) {
      navigation.navigate(BCSCScreens.AccountRenewalInformation)
    }

    if (
      (banner.id === BCSCBanner.IAS_SERVER_NOTIFICATION || banner.id === BCSCBanner.IAS_SERVER_UNAVAILABLE) &&
      typeof banner.metadata?.contactLink === 'string'
    ) {
      try {
        await openLink(banner.metadata.contactLink)
      } catch (error) {
        logger.error('Failed to open URL from banner:', error as Error)
      }
    }

    const message = store.bcsc.bannerMessages.find((banner) => banner.id === bannerId)
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
    dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.DEVICE_LIMIT_EXCEEDED] })
    setMaxDevicesBannerLastDisplayedDate(Date.now())
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
        messages={store.bcsc.bannerMessages
          .filter((banner) => !excludeBanners?.includes(banner.id))
          .map((banner) => ({
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
