import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCState } from '@/store'
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
 * Mirrors Bifold core's `TogglePushNotifications`, built from BCSC components. There are three
 * states, keyed on the OS permission status:
 * - ON (permission granted and the app preference enabled) -> "Notifications are on" + "Open
 *   Settings" to turn them off in the OS (OS-level permissions can't be revoked from within the app).
 * - OFF (permission previously declined/blocked, i.e. the user chose "No" during onboarding or later
 *   turned notifications off in the OS) -> "Notifications are off" + "Open Settings" to turn them
 *   back on. The symmetric opposite of the ON screen.
 * - UNSET (never prompted, e.g. the user tapped "Skip" during onboarding, or permission granted but
 *   the app preference is still off) -> enable notifications in-app (request OS permission if needed,
 *   register the device with the mediator) so setup can be completed end-to-end.
 *
 * @returns {React.ReactElement} The NotificationSettingsScreen component.
 */
export const NotificationSettingsScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
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
    PushNotifications.hasPromptedForNotifications()
      .then(setHasPrompted)
      .catch(() => {
        // Storage read failed; keep the default (false) so the enable flow stays available.
      })
  }, [])

  const isGranted = status === PushNotifications.NotificationPermissionStatus.GRANTED
  // Fully enabled means the OS permission is granted AND the app preference is on (the flag that
  // gates mediator registration). Granted-but-preference-off happens when the user enables the
  // permission in OS settings after previously declining; offer the enable flow to finish setup.
  const notificationsActive = isGranted && store.preferences.usePushNotifications
  const isDeniedOrBlocked =
    status === PushNotifications.NotificationPermissionStatus.DENIED ||
    status === PushNotifications.NotificationPermissionStatus.BLOCKED

  // The OFF state: the user declined ("No" during onboarding) or later turned notifications off in
  // the OS. Gate on hasPrompted so a fresh install — where React Native can report the wrong status
  // before the first prompt — falls through to the UNSET enable flow instead of showing OFF.
  const notificationsDisabled = hasPrompted && isDeniedOrBlocked

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

  // ON and OFF are both OS-managed states: same layout, shared body, and an "Open Settings" button —
  // only the header's on/off word differs. UNSET (never prompted, or granted-but-preference-off)
  // keeps the in-app enable flow.
  const osManaged = notificationsActive || notificationsDisabled

  const header = osManaged
    ? t('BCSC.Settings.NotificationsStatusHeader', {
        status: notificationsActive
          ? t('BCSC.Settings.NotificationsStatusOn')
          : t('BCSC.Settings.NotificationsStatusOff'),
      })
    : t('BCSC.Onboarding.NotificationsHeader')

  const content = osManaged ? t('BCSC.Settings.NotificationsStatusContent') : t('BCSC.Onboarding.NotificationsContent')

  const controls = (
    <ControlContainer>
      {osManaged ? (
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
        {header}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{content}</ThemedText>
    </ScreenWrapper>
  )
}
