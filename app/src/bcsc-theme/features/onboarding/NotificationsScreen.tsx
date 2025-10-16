import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  DispatchAction,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'

// TODO: Replace with real content when available
const mockNotificationsContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

interface NotificationsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingNotificationsScreen>
}

/**
 * Renders the notifications screen for the BCSC onboarding process.
 *
 * @returns {*} {JSX.Element} The NotificationsScreen component.
 */
export const NotificationsScreen = (props: NotificationsScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const theme = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scollContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
    buttonContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.md,
    },
  })

  /**
   * Prompts the user to enable push notifications and updates the global state based on their response.
   *
   * Note: This will only display the prompt once.
   *
   * @returns {*} {Promise<void>} A promise that resolves when the operation is complete.
   */
  const activatePushNotifications = async () => {
    const status = await PushNotifications.setup()

    logger.info(`Push notification permission status: ${status}`)

    dispatch({ type: DispatchAction.USE_PUSH_NOTIFICATIONS, payload: [status === 'granted'] })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
        <ThemedText variant="headingThree">{t('Unified.Onboarding.NotificationsHeader')}</ThemedText>
        <ThemedText style={styles.contentText}>{mockNotificationsContent}</ThemedText>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('Global.Continue')}
          buttonType={ButtonType.Primary}
          onPress={async () => {
            await activatePushNotifications()
            props.navigation.navigate(BCSCScreens.OnboardingSecureAppScreen)
          }}
          testID={testIdWithKey('Continue')}
          accessibilityLabel={t('Global.Continue')}
        />

        <Button
          title={t('Unified.Onboarding.NotificationsContinueButtonSecondary')}
          buttonType={ButtonType.Secondary}
          onPress={() => {
            props.navigation.navigate(BCSCScreens.OnboardingSecureAppScreen)
          }}
          testID={testIdWithKey('Continue')}
          accessibilityLabel={t('Unified.Onboarding.NotificationsContinueButtonSecondary')}
        />
      </View>
    </SafeAreaView>
  )
}
