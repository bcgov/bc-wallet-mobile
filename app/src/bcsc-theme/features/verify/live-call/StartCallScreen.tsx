import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, ImageErrorEvent, StyleSheet } from 'react-native'
import { useMicrophonePermission } from 'react-native-vision-camera'

type StartCallScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.StartCall>
}

const StartCallScreen = ({ navigation }: StartCallScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()
  const [showPermissionDisabled, setShowPermissionDisabled] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const hasRequestedPermission = useRef(false)
  const { emitAlert } = useErrorAlert()

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
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const onPressStart = async () => {
    if (hasMicrophonePermission) {
      navigation.navigate(BCSCScreens.LiveCall)
      return
    }

    if (!hasRequestedPermission.current) {
      hasRequestedPermission.current = true
      const granted = await requestMicrophonePermission()
      if (granted) {
        navigation.navigate(BCSCScreens.LiveCall)
        return
      }
    }
    setShowPermissionDisabled(true)
  }

  const handleImageError = (error: ImageErrorEvent) => {
    logger.error('[StartCallScreen] Error loading user photo for live call', { error })

    emitAlert(t('Alerts.LiveCallFileUploadError.Title'), t('Alerts.LiveCallFileUploadError.Description'), {
      /**
       * Note: Documentation states 'OK' just closes the alert, but also states:
       * "On 'Call Now' if the photos could not be uploaded the video call will not be created."
       *  So we navigate back to the verification method selection screen to restart the flow.
       */
      actions: [
        {
          text: t('Alerts.Actions.DefaultOK'),
          onPress: () => {
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }],
              })
            )
          },
        },
      ],
    })
  }

  if (showPermissionDisabled) {
    return <PermissionDisabled permissionType="microphone" />
  }

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.VideoCall.StartCall')}
      accessibilityLabel={t('BCSC.VideoCall.StartVideoCall')}
      onPress={onPressStart}
    />
  )

  return (
    <ScreenWrapper controls={controls}>
      <Image
        source={{ uri: `file://${store.bcsc.photoPath}` }}
        resizeMode={'contain'}
        style={styles.image}
        onError={handleImageError}
      />
      <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.xxl }}>
        {t('BCSC.VideoCall.StartVideoCallDescription')}
      </ThemedText>
      <ThemedText style={{ marginTop: Spacing.lg }}>{t('BCSC.VideoCall.YouShould')}</ThemedText>
      <BulletPointWithText translationKey={'BCSC.VideoTips.PrivatePlace'} />
      <BulletPointWithText translationKey={'BCSC.VideoTips.OnlyPerson'} />
      <BulletPointWithText translationKey={'BCSC.VideoTips.RemoveGlasses'} />
    </ScreenWrapper>
  )
}

export default StartCallScreen
