import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { deviceRequiresBluetoothPermission } from '@/bcsc-theme/utils/bluetooth'
import { formatServiceAndUnavailableHours, FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import BulletPointWithText from '@/components/BulletPointWithText'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
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
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, AppState, Image, ImageErrorEvent, StyleSheet, View } from 'react-native'
import { useMicrophonePermission } from 'react-native-vision-camera'
import { BluetoothDisclosure } from '../BluetoothDisclosure'
import ServicePeriodList from './components/ServicePeriodList'

type CallStatus = 'idle' | 'checkPermissions' | 'bluetoothDisclosure' | 'bluetoothDenied' | 'microphoneDenied'

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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const hasRequestedPermission = useRef(false)
  const { liveCallFileUploadAlert, unknownErrorModal } = useAlerts(navigation)
  const [formattedHours, setFormattedHours] = useState<FormattedServicePeriod[]>([])
  const [hoursLoading, setHoursLoading] = useState(true)
  const [status, setStatus] = useState<CallStatus>('idle')

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

  useFocusEffect(
    useCallback(() => {
      setStatus('idle')
    }, [])
  )

  useEffect(() => {
    // Opening Settings backgrounds the app without blurring this screen, so useFocusEffect never fires on return
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return
      }

      setStatus((current) => {
        // If the user denied microphone or Bluetooth permission, we need to reset the status to 'idle' so they can try again
        if (current === 'microphoneDenied' || current === 'bluetoothDenied') {
          return 'idle'
        }

        return current
      })
    })

    return () => subscription.remove()
  }, [])

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

  const onPressStart = async () => {
    setStatus('checkPermissions')

    let micPermissionGranted = hasMicrophonePermission

    if (!micPermissionGranted && !hasRequestedPermission.current) {
      // Request microphone permission only once per screen mount
      hasRequestedPermission.current = true
      micPermissionGranted = await requestMicrophonePermission()
    }

    if (!micPermissionGranted) {
      // If the user denies microphone permission, we cannot proceed with the call
      setStatus('microphoneDenied')
      return
    }

    let needsBluetoothPermission = false
    try {
      needsBluetoothPermission = await deviceRequiresBluetoothPermission()
    } catch (error) {
      // Bluetooth detection is best-effort, the call still works without it
      logger.error('[StartCallScreen] Error detecting Bluetooth audio, continuing without the prompt', error as Error)
    }

    if (needsBluetoothPermission) {
      // If the device requires Bluetooth permission, we need to show the Bluetooth disclosure screen
      setStatus('bluetoothDisclosure')
      return
    }

    navigation.navigate(BCSCScreens.LiveCall)
  }

  const handleImageError = (error: ImageErrorEvent) => {
    logger.error('[StartCallScreen] Error loading user photo for live call', { error })

    liveCallFileUploadAlert()
  }

  if (status === 'microphoneDenied') {
    return <PermissionDisabled permissionType={'microphone'} />
  }

  if (status === 'bluetoothDenied') {
    return <PermissionDisabled permissionType={'bluetooth'} />
  }

  if (status === 'bluetoothDisclosure') {
    return (
      <BluetoothDisclosure
        onContinue={(permissionGranted) => {
          if (!permissionGranted) {
            return setStatus('bluetoothDenied')
          }
          // If the user grants Bluetooth permission, we can proceed to the live call
          navigation.navigate(BCSCScreens.LiveCall)
        }}
      />
    )
  }

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.VideoCall.StartCall')}
        accessibilityLabel={t('BCSC.VideoCall.StartVideoCall')}
        onPress={onPressStart}
        disabled={status !== 'idle'}
        testID={testIdWithKey(TestIds.verify.startCall.start)}
      >
        {status === 'checkPermissions' && <ButtonLoading />}
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
        testID={testIdWithKey(TestIds.verify.startCall.hoursOfServiceTitle)}
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
