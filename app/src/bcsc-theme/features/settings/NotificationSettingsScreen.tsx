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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNotificationPermissionStatus } from './useNotificationPermissionStatus'

const BELL_ICON_SIZE = 24

const INSTRUCTION_STEPS = [
  'BCSC.Settings.NotificationsStep1',
  'BCSC.Settings.NotificationsStep2',
  'BCSC.Settings.NotificationsStep3',
  'BCSC.Settings.NotificationsStep4',
]

/**
 * Settings sub-screen for managing push notifications.
 *
 * There are three states, keyed on the OS permission status:
 * - ON (permission granted and the app preference enabled) and OFF (previously declined/blocked)
 *   are both OS-managed: notifications can't be toggled from within the app, so these show the
 *   current status ("on"/"off") plus instructions and a "Go to device settings" button. Only the
 *   status word differs. The status refreshes on focus/foreground, so returning from device settings
 *   reflects any change immediately.
 * - UNSET (never prompted, e.g. the user tapped "Skip" during onboarding, or permission granted but
 *   the app preference is still off) keeps the in-app enable flow: request the OS permission if
 *   needed and register the device with the mediator, so setup can be completed end-to-end. Device
 *   settings alone can't produce the first OS prompt, so this path can't collapse into the others.
 *
 * @returns {React.ReactElement} The NotificationSettingsScreen component.
 */
export const NotificationSettingsScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
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
    heading: {
      color: ColorPalette.brand.primary,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginVertical: Spacing.sm,
    },
    statusValue: {
      color: ColorPalette.brand.primary,
      textTransform: 'uppercase',
    },
    instructionsBox: {
      backgroundColor: ColorPalette.brand.tertiaryBackground,
      borderRadius: Spacing.xs,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    bulletRow: {
      flexDirection: 'row',
    },
    bullet: {
      paddingHorizontal: Spacing.sm,
    },
    bulletText: {
      flex: 1,
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

  // ON and OFF are both OS-managed states: same layout, only the status word differs. UNSET (never
  // prompted, or granted-but-preference-off) keeps the in-app enable flow.
  const osManaged = notificationsActive || notificationsDisabled
  const statusWord = notificationsActive
    ? t('BCSC.Settings.NotificationsStatusOn')
    : t('BCSC.Settings.NotificationsStatusOff')

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

  const openDeviceSettings = useCallback(async () => {
    try {
      await Linking.openSettings()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[NotificationSettingsScreen] Failed to open device settings: ${message}`)
    }
  }, [logger])

  const controls = (
    <ControlContainer>
      {osManaged ? (
        <Button
          title={t('BCSC.Settings.OpenDeviceSettings')}
          buttonType={ButtonType.Primary}
          onPress={openDeviceSettings}
          testID={testIdWithKey('OpenNotificationSettings')}
          accessibilityLabel={t('BCSC.Settings.OpenDeviceSettings')}
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

  // UNSET: keep the onboarding-style enable screen (image + centered copy + in-app enable button).
  if (!osManaged) {
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
          {t('BCSC.Onboarding.NotificationsHeader')}
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.NotificationsContent')}</ThemedText>
      </ScreenWrapper>
    )
  }

  // ON / OFF: OS-managed status + instructions to change it in device settings.
  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant="headingThree" style={styles.heading}>
        {t('BCSC.Settings.ChangeNotificationsHeader')}
      </ThemedText>
      <ThemedText>{t('BCSC.Settings.NotificationsEnabledContent')}</ThemedText>

      <View
        style={styles.statusRow}
        accessible
        accessibilityLabel={`${t('BCSC.Settings.NotificationsAreLabel')} ${statusWord}`}
      >
        <Icon name="bell-outline" size={BELL_ICON_SIZE} color={ColorPalette.grayscale.darkGrey} />
        <ThemedText>{t('BCSC.Settings.NotificationsAreLabel')}</ThemedText>
        <ThemedText variant="bold" style={styles.statusValue}>
          {statusWord}
        </ThemedText>
      </View>

      <View style={styles.instructionsBox}>
        <ThemedText variant="bold">{t('BCSC.Settings.ChangeNotificationsInstructions')}</ThemedText>
        {INSTRUCTION_STEPS.map((key) => (
          <View key={key} style={styles.bulletRow}>
            <ThemedText style={styles.bullet}>{'•'}</ThemedText>
            <ThemedText style={styles.bulletText}>{t(key)}</ThemedText>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  )
}
