import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { formatServiceAndUnavailableHours, FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import BulletPointWithText from '@/components/BulletPointWithText'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, ImageErrorEvent, PermissionsAndroid, Platform, StyleSheet, View } from 'react-native'
import { useMicrophonePermission } from 'react-native-vision-camera'
import ServicePeriodList from './components/ServicePeriodList'

type StartCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.StartCall>
}

const StartCallScreen = ({ navigation }: StartCallScreenProps) => {
  const { ButtonLoading } = useAnimatedComponents()
  const { Spacing, ColorPalette } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { video: videoCallApi } = useApi()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()
  const [showPermissionDisabled, setShowPermissionDisabled] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const hasRequestedPermission = useRef(false)
  const { liveCallFileUploadAlert } = useAlerts(navigation)
  const [isWaitingForPermissions, setIsWaitingForPermissions] = useState(false)
  const [formattedHours, setFormattedHours] = useState<FormattedServicePeriod[]>([])
  const [hoursLoading, setHoursLoading] = useState(true)

  useEffect(() => {
    videoCallApi
      .getServiceHours()
      .then((serviceHours) => setFormattedHours(formatServiceAndUnavailableHours(serviceHours)))
      .catch((error) => {
        // ServicePeriodList falls back to the default hours string when the list is empty
        logger.error('Error loading live call service hours:', error as Error)
        setFormattedHours([])
      })
      .finally(() => setHoursLoading(false))
  }, [videoCallApi, logger])

  const styles = StyleSheet.create({
    // At smaller sizes the Image tag will ignore exif tags, which provide orientation
    // (along with other metadata.) Image is rendered at a larger size to pick up the
    // exif data, then scaled down and given negative margin to fit in the button
    image: {
      height: 300, // height that will ensure EXIF
      alignSelf: 'center',
      aspectRatio: 1 / 1.3,
      overflow: 'hidden',
      transform: [{ scale: 0.333 }], // scale to match thumbnailHeight
      margin: -100, // -height * scale
      // 'cover' (set on the Image) fills the box edge-to-edge so the border has no letterbox
      // gap to span. The border is rendered before the 0.333 scale above, so 6 lands on a ~2px
      // visible frame — matching the gold stroke of the selfie capture mask (TakePhotoScreen).
      borderWidth: 6,
      borderColor: ColorPalette.brand.highlight,
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const requestBluetoothPermission = async () => {
    // On Android 12+, BLUETOOTH_CONNECT must be requested at runtime.
    // Without it, InCallManager's BluetoothManager silently fails to start
    // and call audio always routes to the speaker instead of BT headsets.
    try {
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
      }
    } catch (error) {
      // Not a blocker — the call still works without Bluetooth
      logger.warn('Failed to request Bluetooth permission', { error: error as Error })
    }
  }

  const onPressStart = async () => {
    setIsWaitingForPermissions(true)
    if (hasMicrophonePermission) {
      await requestBluetoothPermission()
      navigation.navigate(BCSCScreens.LiveCall)
      return
    }

    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true
      const granted = await requestMicrophonePermission()
      if (granted) {
        await requestBluetoothPermission()
        navigation.navigate(BCSCScreens.LiveCall)
        return
      }
    }
    setShowPermissionDisabled(true)
    setIsWaitingForPermissions(false)
  }

  const handleImageError = (error: ImageErrorEvent) => {
    logger.error('[StartCallScreen] Error loading user photo for live call', { error })

    liveCallFileUploadAlert()
  }

  if (showPermissionDisabled) {
    return <PermissionDisabled permissionType="microphone" />
  }

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.VideoCall.StartCall')}
        accessibilityLabel={t('BCSC.VideoCall.StartVideoCall')}
        onPress={onPressStart}
        disabled={isWaitingForPermissions}
        testID={testIdWithKey('StartCall')}
      >
        {isWaitingForPermissions && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <Image
        source={{ uri: `file://${store.bcsc.photoPath}` }}
        resizeMode={'cover'}
        style={styles.image}
        onError={handleImageError}
      />
      <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.xl }}>
        {t('BCSC.VideoCall.StartVideoCallTitle')}
      </ThemedText>
      <ThemedText variant={'bold'} style={{ marginTop: Spacing.md }}>
        {t('BCSC.VideoCall.StartVideoCallDescription')}
      </ThemedText>
      <ThemedText variant={'headingFour'} style={{ marginTop: Spacing.lg }}>
        {t('BCSC.VideoCall.YouShould')}
      </ThemedText>
      <BulletPointWithText translationKey={'BCSC.VideoTips.PrivatePlace'} iconColor={ColorPalette.grayscale.darkGrey} />
      <BulletPointWithText translationKey={'BCSC.VideoTips.OnlyPerson'} iconColor={ColorPalette.grayscale.darkGrey} />
      <BulletPointWithText
        translationKey={'BCSC.VideoTips.RemoveGlasses'}
        iconColor={ColorPalette.grayscale.darkGrey}
      />
      <ThemedText
        variant={'headingFour'}
        style={{ marginTop: Spacing.lg }}
        testID={testIdWithKey('HoursOfServiceTitle')}
      >
        {t('BCSC.VideoCall.CallBusyOrClosed.HoursOfService')}
      </ThemedText>
      <View style={{ marginTop: Spacing.sm }}>
        {hoursLoading ? (
          <ActivityIndicator style={{ alignSelf: 'center' }} />
        ) : (
          <ServicePeriodList items={formattedHours} />
        )}
      </View>
    </ScreenWrapper>
  )
}

export default StartCallScreen
