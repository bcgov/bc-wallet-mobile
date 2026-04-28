import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import Blob from '@assets/img/blob.svg'
import PushNotificationImage from '@assets/img/push-notifications-image.svg'
import {
  Button,
  ButtonType,
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
import { AppState, StyleSheet, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'

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
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [deniedPermission, setDeniedPermission] = useState(false)

  const styles = StyleSheet.create({
    imageContainer: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
  })

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
    <ControlContainer>
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
    </ControlContainer>
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
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <View style={styles.imageContainer}>
        <Blob />
        <PushNotificationImage style={{ position: 'absolute' }} />
      </View>
      <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
        {t('BCSC.Onboarding.NotificationsHeader')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.NotificationsContent')}</ThemedText>
    </ScreenWrapper>
  )
}
