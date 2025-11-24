import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import notifications from '@assets/img/notifications.png'
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
import { Image, StyleSheet, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
import BulletPoint from '../../components/BulletPoint'
interface NotificationsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingNotifications>
}

/**
 * Renders the notifications screen for the BCSC onboarding process.
 *
 * @returns {*} {JSX.Element} The NotificationsScreen component.
 */
export const NotificationsScreen = ({ navigation }: NotificationsScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
    bulletContainer: {
      gap: Spacing.sm,
      paddingLeft: Spacing.sm,
    },
    buttonContainer: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
  })

  const bulletItems = [
    t('BCSC.Onboarding.NotificationsBullet1'),
    t('BCSC.Onboarding.NotificationsBullet2'),
    t('BCSC.Onboarding.NotificationsBullet3'),
    t('BCSC.Onboarding.NotificationsBullet4'),
  ]

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

  const controls = (
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
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.container}
      scrollViewProps={{ contentContainerStyle: styles.scrollContainer }}
      controls={controls}
      controlsContainerStyle={styles.buttonContainer}
    >
      <View style={styles.imageContainer}>
        <Image source={notifications} />
      </View>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.NotificationsHeader')}</ThemedText>
      <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.NotificationsContentA')}</ThemedText>
      <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.NotificationsContentB')}</ThemedText>

      <View style={styles.bulletContainer}>
        {bulletItems.map((item) => (
          <BulletPoint key={item} pointsText={item} />
        ))}
      </View>
    </ScreenWrapper>
  )
}
