import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import notifications from '@assets/img/notifications.png'
import {
  Button,
  ButtonType,
  ContentGradient,
  DispatchAction,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Image, StyleSheet, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
import BulletPoint from '../../components/BulletPoint'

interface NotificationsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingNotifications>
}

/**
 * Renders the notifications screen for the BCSC onboarding process.
 *
 * @returns {*} {React.ReactElement} The NotificationsScreen component.
 */
export const NotificationsScreen = ({ navigation }: NotificationsScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [deniedPermission, setDeniedPermission] = useState(false)

  const styles = StyleSheet.create({
    scrollContainer: {
      gap: Spacing.lg,
    },
    bulletContainer: {
      gap: Spacing.sm,
      paddingLeft: Spacing.sm,
    },
    imageContainer: {
      alignItems: 'center',
    },
  })

  const bulletItems = [
    t('BCSC.Onboarding.NotificationsBullet1'),
    t('BCSC.Onboarding.NotificationsBullet2'),
    t('BCSC.Onboarding.NotificationsBullet3'),
    t('BCSC.Onboarding.NotificationsBullet4'),
  ]

  const checkPermissions = useCallback(async () => {
    const status = await PushNotifications.status()
    const hasPrompted = await PushNotifications.hasPromptedForNotifications()

    // Only show PermissionDisabled if:
    // 1. We have previously prompted the user (to work around React Native bug where status may be incorrect on fresh install)
    // 2. The current status is DENIED or BLOCKED
    const isDeniedOrBlocked =
      status === PushNotifications.NotificationPermissionStatus.DENIED ||
      status === PushNotifications.NotificationPermissionStatus.BLOCKED

    if (hasPrompted && isDeniedOrBlocked) {
      setDeniedPermission(true)
    } else {
      setDeniedPermission(false)
    }
  }, [])

  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  // Re-check permissions when user returns from settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [checkPermissions])

  /**
   * Prompts the user to enable push notifications and updates the global state based on their response.
   *
   * Note: This will only display the prompt once.
   *
   * @returns {*} {Promise<void>} A promise that resolves when the operation is complete.
   */
  const activatePushNotifications = async () => {
    logger.debug(`[NotificationsScreen] Requesting push notification permission`)

    try {
      const status = await PushNotifications.setup()
      logger.info(`[NotificationsScreen] Push notification permission status: ${status}`)
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [status === 'granted'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[NotificationsScreen] Failed to request push notification permission: ${message}`)
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [false] })
    }
  }

  const controls = (
    <View style={{ width: '100%' }}>
      <ContentGradient backgroundColor={ColorPalette.brand.primaryBackground} />
      <Button
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        onPress={async () => {
          await activatePushNotifications()
          navigation.navigate(BCSCScreens.OnboardingSecureApp)
        }}
        testID={testIdWithKey('Continue')}
        accessibilityLabel={t('Global.Continue')}
      />
    </View>
  )

  if (deniedPermission) {
    return (
      <PermissionDisabled
        permissionType="notifications"
        navigateToNextScreen={() => navigation.navigate(BCSCScreens.OnboardingSecureApp)}
      />
    )
  }

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <View style={styles.imageContainer}>
        <Image source={notifications} />
      </View>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.NotificationsHeader')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.NotificationsContentA')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.NotificationsContentB')}</ThemedText>

      <View style={styles.bulletContainer}>
        {bulletItems.map((item) => (
          <BulletPoint key={item} pointsText={item} />
        ))}
      </View>
    </ScreenWrapper>
  )
}
