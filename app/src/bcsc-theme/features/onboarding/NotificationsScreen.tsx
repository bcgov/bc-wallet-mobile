import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useNotificationPermissionStatus } from '@/bcsc-theme/features/settings/useNotificationPermissionStatus'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
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
  const { status, refresh } = useNotificationPermissionStatus()
  const [hasPrompted, setHasPrompted] = useState(false)

  const styles = StyleSheet.create({
    imageContainer: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
  })

  useEffect(() => {
    const readPromptMarker = async () => {
      try {
        const prompted = await PushNotifications.hasPromptedForNotifications()
        // Sticky: a late read must not clear a prompt recorded during this mount
        setHasPrompted((previous) => previous || prompted)
      } catch {
        // Keep the "never prompted" default, as NotificationSettingsScreen does
      }
    }

    void readPromptMarker()
    // Re-read when the OS status changes: a grant is not recorded locally, but setup() has persisted the marker
  }, [status])

  const isGranted = status === PushNotifications.NotificationPermissionStatus.GRANTED
  // Android reports DENIED before the first prompt, so only trust denied/blocked once we have prompted
  const isDenied =
    hasPrompted &&
    (status === PushNotifications.NotificationPermissionStatus.DENIED ||
      status === PushNotifications.NotificationPermissionStatus.BLOCKED)

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
      const result = await PushNotifications.setup()
      logger.info(`[NotificationsScreen] Push notification permission status: ${result}`)
      // A refusal does not change the OS status value on Android, so this is what swaps in PermissionDisabled.
      // Not set on a grant: Android still reads DENIED until the refresh lands, which would flash PermissionDisabled.
      if (result !== PushNotifications.NotificationPermissionStatus.GRANTED) {
        setHasPrompted(true)
      }
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [result === 'granted'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[NotificationsScreen] Failed to request push notification permission: ${message}`)
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [false] })
    } finally {
      // Not awaited: the OS read must not delay navigation
      void refresh()
    }
  }

  const skipPushNotifications = () => {
    dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [false] })
  }

  // Re-assert the preference: it lags an OS grant made outside this screen, e.g. from OS Settings
  const continueWithNotifications = () => {
    dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [true] })
    navigation.navigate(BCSCScreens.OnboardingSecureApp)
  }

  const grantedControls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        onPress={continueWithNotifications}
        testID={testIdWithKey(TestIds.onboarding.notifications.continue)}
        accessibilityLabel={t('Global.Continue')}
      />
    </ControlContainer>
  )

  const enableOrSkipControls = (
    <ControlContainer>
      <Button
        title={t('BCSC.Onboarding.EnableNotifications')}
        buttonType={ButtonType.Primary}
        onPress={async () => {
          await activatePushNotifications()
          navigation.navigate(BCSCScreens.OnboardingSecureApp)
        }}
        testID={testIdWithKey(TestIds.onboarding.notifications.enable)}
        accessibilityLabel={t('BCSC.Onboarding.EnableNotifications')}
      />
      <Button
        title={t('BCSC.Onboarding.SkipNotifications')}
        buttonType={ButtonType.Secondary}
        onPress={() => {
          skipPushNotifications()
          navigation.navigate(BCSCScreens.OnboardingSecureApp)
        }}
        testID={testIdWithKey(TestIds.onboarding.notifications.skip)}
        accessibilityLabel={t('BCSC.Onboarding.SkipNotifications')}
      />
    </ControlContainer>
  )

  if (isDenied) {
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
      controls={isGranted ? grantedControls : enableOrSkipControls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <View style={styles.imageContainer}>
        <PushNotificationImage />
      </View>
      <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
        {t('BCSC.Onboarding.NotificationsHeader')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.NotificationsContent')}</ThemedText>
    </ScreenWrapper>
  )
}
