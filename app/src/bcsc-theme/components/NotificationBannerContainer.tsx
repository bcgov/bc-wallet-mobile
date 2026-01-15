import { BCDispatchAction, BCState } from '@/store'
import { SafeAreaModal, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
import { ReviewDevices } from '../features/settings/components/ReviewDevices'
import { BCSCMainStackParams, BCSCScreens } from '../types/navigators'
import { AppBanner, BCSCBanner } from './AppBanner'

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
  const [store, dispatch] = useStore<BCState>()
  const [devicesModalVisible, setDevicesModalVisible] = useState(false)
  const devicesModalShouldAnimate = useRef(true)
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

  const handleBannerPress = (bannerId: BCSCBanner): void => {
    // Handle other banner types as needed

    if (bannerId === BCSCBanner.DEVICE_LIMIT_EXCEEDED) {
      return setDevicesModalVisible(true)
    }

    if (bannerId === BCSCBanner.ACCOUNT_EXPIRING_SOON) {
      navigation.navigate(BCSCScreens.AccountRenewalInformation)
    }

    const message = store.bcsc.bannerMessages.find((banner) => banner.id === bannerId)
    // Only dismiss the banner if it is marked as dismissable
    if (message && message.dismissible) {
      // Default action: remove the banner permanently on press
      dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [bannerId] })
    }
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

      <AppBanner
        messages={store.bcsc.bannerMessages.map((banner) => ({
          id: banner.id,
          title: banner.title,
          description: banner.description,
          type: banner.type,
          dismissible: banner.dismissible,
          onPress: () => handleBannerPress(banner.id),
        }))}
      />
    </View>
  )
}
