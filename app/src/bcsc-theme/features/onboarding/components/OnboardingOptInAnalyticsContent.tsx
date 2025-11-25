import { BCDispatchAction, BCState } from '@/store'
import analytics from '@assets/img/analytics.png'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Image, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface OnboardingOptInAnalyticsContentProps {
  onPress: () => void
}
/**
 * Analytics Opt In content that informs users about the app's data collection practices.
 * @returns {*} {JSX.Element} The OnboardingOptInAnalyticsContent component.
 */
export const OnboardingOptInAnalyticsContent: React.FC<OnboardingOptInAnalyticsContentProps> = ({
  onPress,
}: OnboardingOptInAnalyticsContentProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
    buttonContainer: {
      padding: theme.Spacing.md,
      gap: theme.Spacing.sm,
    },
    sectionContainer: {
      gap: theme.Spacing.md,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: theme.Spacing.md,
      gap: theme.Spacing.md,
    },
  })

  const handleAcceptPressed = () => {
    logger.info('User accepted analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
    onPress()
  }
  const handleDeniedPressed = () => {
    logger.info('User denied analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
    onPress()
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.sectionContainer}>
          <View style={styles.imageContainer}>
            <Image source={analytics} />
          </View>
          <View style={styles.titleContainer}>
            <ThemedText variant="headingOne">{t('BCSC.Onboarding.AnalyticsTitle')}</ThemedText>
          </View>
            <ThemedText variant="headingThree">{t('BCSC.Onboarding.AnalyticsHeader')}</ThemedText>
          <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.AnalyticsContent')}</ThemedText>
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.Onboarding.AcceptAnalytics')}
          buttonType={ButtonType.Primary}
          onPress={handleAcceptPressed}
        />
        <Button
          title={t('BCSC.Onboarding.DenyAnalytics')}
          buttonType={ButtonType.Secondary}
          onPress={handleDeniedPressed}
        />
      </View>
    </SafeAreaView>
  )
}
