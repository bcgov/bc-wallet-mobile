import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking, Platform, StyleSheet, View } from 'react-native'

export type PermissionType = 'camera' | 'microphone' | 'notifications' | 'cameraAndMicrophone'

type PermissionDisabledProps = {
  permissionType: PermissionType
  headerPadding?: boolean
  navigateToNextScreen?: () => void
}

type PlatformSteps = {
  ios: string[]
  android: string[]
}

type TranslationConfig = {
  title: string
  description: string
  steps: PlatformSteps
}

const translationKeys: Record<PermissionType, TranslationConfig> = {
  camera: {
    title: 'BCSC.PermissionDisabled.CameraTitle',
    description: 'BCSC.PermissionDisabled.CameraDescription',
    steps: {
      ios: [
        'BCSC.PermissionDisabled.Camera.iOS.Step1',
        'BCSC.PermissionDisabled.Camera.iOS.Step2',
        'BCSC.PermissionDisabled.Camera.iOS.Step3',
      ],
      android: [
        'BCSC.PermissionDisabled.Camera.Android.Step1',
        'BCSC.PermissionDisabled.Camera.Android.Step2',
        'BCSC.PermissionDisabled.Camera.Android.Step3',
        'BCSC.PermissionDisabled.Camera.Android.Step4',
        'BCSC.PermissionDisabled.Camera.Android.Step5',
      ],
    },
  },
  microphone: {
    title: 'BCSC.PermissionDisabled.MicrophoneTitle',
    description: 'BCSC.PermissionDisabled.MicrophoneDescription',
    steps: {
      ios: [
        'BCSC.PermissionDisabled.Microphone.iOS.Step1',
        'BCSC.PermissionDisabled.Microphone.iOS.Step2',
        'BCSC.PermissionDisabled.Microphone.iOS.Step3',
      ],
      android: [
        'BCSC.PermissionDisabled.Microphone.Android.Step1',
        'BCSC.PermissionDisabled.Microphone.Android.Step2',
        'BCSC.PermissionDisabled.Microphone.Android.Step3',
        'BCSC.PermissionDisabled.Microphone.Android.Step4',
        'BCSC.PermissionDisabled.Microphone.Android.Step5',
      ],
    },
  },
  notifications: {
    title: 'BCSC.PermissionDisabled.NotificationsTitle',
    description: 'BCSC.PermissionDisabled.NotificationsDescription',
    steps: {
      ios: [
        'BCSC.PermissionDisabled.Notifications.iOS.Step1',
        'BCSC.PermissionDisabled.Notifications.iOS.Step2',
        'BCSC.PermissionDisabled.Notifications.iOS.Step3',
      ],
      android: [
        'BCSC.PermissionDisabled.Notifications.Android.Step1',
        'BCSC.PermissionDisabled.Notifications.Android.Step2',
        'BCSC.PermissionDisabled.Notifications.Android.Step3',
        'BCSC.PermissionDisabled.Notifications.Android.Step4',
        'BCSC.PermissionDisabled.Notifications.Android.Step5',
      ],
    },
  },
  cameraAndMicrophone: {
    title: 'BCSC.PermissionDisabled.CameraAndMicrophoneTitle',
    description: 'BCSC.PermissionDisabled.CameraAndMicrophoneDescription',
    steps: {
      ios: [
        'BCSC.PermissionDisabled.CameraAndMicrophone.iOS.Step1',
        'BCSC.PermissionDisabled.CameraAndMicrophone.iOS.Step2',
        'BCSC.PermissionDisabled.CameraAndMicrophone.iOS.Step3',
        'BCSC.PermissionDisabled.CameraAndMicrophone.iOS.Step4',
      ],
      android: [
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step1',
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step2',
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step3',
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step4',
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step5',
        'BCSC.PermissionDisabled.CameraAndMicrophone.Android.Step6',
      ],
    },
  },
}

export const PermissionDisabled = ({
  permissionType,
  headerPadding = false,
  navigateToNextScreen,
}: PermissionDisabledProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const handleOpenSettings = async () => {
    await Linking.openSettings()
  }

  const styles = StyleSheet.create({
    title: {
      marginBottom: Spacing.lg,
    },
    description: {
      marginBottom: Spacing.lg,
    },
    stepContainer: {
      marginBottom: Spacing.sm,
    },
    stepText: {
      color: ColorPalette.grayscale.white,
    },
  })

  const keys = translationKeys[permissionType]
  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  const steps = keys.steps[platform]

  const controls = (
    <>
      <Button
        title={t('BCSC.PermissionDisabled.OpenSettings')}
        buttonType={ButtonType.Primary}
        onPress={handleOpenSettings}
        testID={testIdWithKey('OpenSettings')}
        accessibilityLabel={t('BCSC.PermissionDisabled.OpenSettings')}
      />
      {permissionType === 'notifications' && navigateToNextScreen ? (
        <Button
          title={t('BCSC.PermissionDisabled.ContinueWithoutNotifications')}
          buttonType={ButtonType.Secondary}
          onPress={navigateToNextScreen}
          testID={testIdWithKey('ContinueWithoutNotifications')}
          accessibilityLabel={t('BCSC.PermissionDisabled.ContinueWithoutNotifications')}
        />
      ) : null}
    </>
  )

  return (
    <ScreenWrapper
      controls={controls}
      style={headerPadding ? { paddingTop: Spacing.lg } : {}}
      edges={headerPadding ? ['top', 'bottom'] : undefined}
    >
      <ThemedText variant={'headingTwo'} style={styles.title}>
        {t(keys.title)}
      </ThemedText>
      <ThemedText style={styles.description}>{t(keys.description)}</ThemedText>

      {steps.map((stepKey, index) => (
        <View key={index} style={styles.stepContainer}>
          <ThemedText style={styles.stepText}>{t(stepKey)}</ThemedText>
        </View>
      ))}
    </ScreenWrapper>
  )
}
