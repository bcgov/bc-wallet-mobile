import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCState } from '@/store'
import * as PushNotifications from '@/utils/PushNotificationsHelper'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useCallback } from 'react'
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
 * OS-level notification permissions can't be toggled from within the app, so this screen only
 * reports the current status and directs the user to their device settings to change it. The status
 * word is "on" only when the OS permission is granted AND the app preference is enabled; anything
 * else (declined, never prompted, or granted-but-preference-off) reads as "off". The status
 * refreshes on focus/foreground, so returning from device settings reflects any change immediately.
 *
 * @returns {React.ReactElement} The NotificationSettingsScreen component.
 */
export const NotificationSettingsScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { status } = useNotificationPermissionStatus()

  const openDeviceSettings = useCallback(async () => {
    try {
      await Linking.openSettings()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[NotificationSettingsScreen] Failed to open device settings: ${message}`)
    }
  }, [logger])

  const isGranted = status === PushNotifications.NotificationPermissionStatus.GRANTED
  const notificationsActive = isGranted && store.preferences.usePushNotifications
  const statusWord = notificationsActive
    ? t('BCSC.Settings.NotificationsStatusOn')
    : t('BCSC.Settings.NotificationsStatusOff')

  const styles = StyleSheet.create({
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

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.Settings.OpenDeviceSettings')}
        buttonType={ButtonType.Primary}
        onPress={openDeviceSettings}
        testID={testIdWithKey('OpenNotificationSettings')}
        accessibilityLabel={t('BCSC.Settings.OpenDeviceSettings')}
      />
    </ControlContainer>
  )

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
