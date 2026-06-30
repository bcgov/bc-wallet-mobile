import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import * as PushNotifications from '@/utils/PushNotificationsHelper'
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
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import { useNotificationPermissionStatus } from './useNotificationPermissionStatus'

/**
 * Settings sub-screen for managing push notifications.
 *
 * Mirrors Bifold core's `TogglePushNotifications`, built from BCSC components:
 * - Permission previously declined/blocked -> manual OS instructions (`PermissionDisabled`).
 * - Permission granted -> "Open Settings" to turn notifications off in the OS (OS-level
 *   permissions can't be revoked from within the app).
 * - Otherwise -> enable notifications (request OS permission, register the device with the mediator).
 *
 * @returns {React.ReactElement} The NotificationSettingsScreen component.
 */
export const NotificationSettingsScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [, dispatch] = useStore()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const agent = useBCSCAgentSafe()?.agent ?? null
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
    PushNotifications.hasPromptedForNotifications().then(setHasPrompted)
  }, [])

  const isGranted = status === PushNotifications.NotificationPermissionStatus.GRANTED
  const isDeniedOrBlocked =
    status === PushNotifications.NotificationPermissionStatus.DENIED ||
    status === PushNotifications.NotificationPermissionStatus.BLOCKED

  // Mirror onboarding: only route to OS-settings instructions once we've prompted, to dodge the
  // React Native fresh-install bug where the permission status can be wrong before the first prompt.
  const showPermissionDisabled = hasPrompted && isDeniedOrBlocked

  const enableNotifications = useCallback(async () => {
    logger.debug('[NotificationSettingsScreen] Requesting push notification permission')

    try {
      const result = await PushNotifications.setup()
      logger.info(`[NotificationSettingsScreen] Push notification permission status: ${result}`)
      const granted = result === PushNotifications.NotificationPermissionStatus.GRANTED
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [granted] })
      // Agent setup already ran, so register the device token with the mediator now.
      if (granted && agent) {
        await PushNotifications.activate(agent)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[NotificationSettingsScreen] Failed to request push notification permission: ${message}`)
      dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [false] })
    } finally {
      setHasPrompted(true)
      await refresh()
    }
  }, [agent, dispatch, logger, refresh])

  if (showPermissionDisabled) {
    return <PermissionDisabled permissionType="notifications" />
  }

  const controls = (
    <ControlContainer>
      {isGranted ? (
        <Button
          title={t('BCSC.PermissionDisabled.OpenSettings')}
          buttonType={ButtonType.Primary}
          onPress={() => Linking.openSettings()}
          testID={testIdWithKey('OpenNotificationSettings')}
          accessibilityLabel={t('BCSC.PermissionDisabled.OpenSettings')}
        />
      ) : (
        <Button
          title={t('BCSC.Onboarding.EnableNotifications')}
          buttonType={ButtonType.Primary}
          onPress={enableNotifications}
          testID={testIdWithKey('EnableNotifications')}
          accessibilityLabel={t('BCSC.Onboarding.EnableNotifications')}
        />
      )}
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <View style={styles.imageContainer}>
        <PushNotificationImage />
      </View>
      <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
        {isGranted ? t('BCSC.Settings.NotificationsEnabledHeader') : t('BCSC.Onboarding.NotificationsHeader')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>
        {isGranted ? t('BCSC.Settings.NotificationsEnabledContent') : t('BCSC.Onboarding.NotificationsContent')}
      </ThemedText>
    </ScreenWrapper>
  )
}
