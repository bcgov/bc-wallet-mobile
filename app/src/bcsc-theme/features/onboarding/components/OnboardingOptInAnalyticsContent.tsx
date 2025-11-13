import { CardButton } from '@/bcsc-theme/components/CardButton'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface OnboardingOptInAnalyticsContentProps {
  onPress: () => void
}
/**
 * Analytics Opt In content that informs users about the app's data collection practices.
 *
 * onPress: optional function to be called when the Continue button is pressed,
 * if not provided, the Continue button will not be displayed.
 *
 * @returns {*} {JSX.Element} The OnboardingOptInAnalyticsContent component.
 */
export const OnboardingOptInAnalyticsContent: React.FC<OnboardingOptInAnalyticsContentProps> = ({
  onPress,
}: OnboardingOptInAnalyticsContentProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [store, dispatch] = useStore<BCState>()
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
    },
    sectionContainer: {
      gap: theme.Spacing.sm,
      marginTop: theme.Spacing.lg,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
  })

  const handleAcceptPressed = () => {
    logger.info('User accepted analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
    onPress()
    logger.info(store.bcsc.analyticsOptIn ? 'Analytics opt-in is true' : 'Analytics opt-in is false')
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
          <ThemedText variant="headingFour">{t('Unified.Onboarding.AnalyticsContent')}</ThemedText>
          <ThemedText style={styles.contentText}>
            {
              'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et'
            }
          </ThemedText>
        </View>

        <CardButton title={t('Unified.Onboarding.AcceptAnalytics')} onPress={handleAcceptPressed} />
        <CardButton title={t('Unified.Onboarding.DenyAnalytics')} onPress={handleDeniedPressed} />
      </ScrollView>
    </SafeAreaView>
  )
}
