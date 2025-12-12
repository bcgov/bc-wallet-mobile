import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import analytics from '@assets/img/analytics.png'
import { Button, ButtonType, ScreenWrapper, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Image, StyleSheet, View } from 'react-native'

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
    sectionContainer: {
      gap: theme.Spacing.md,
    },
    contentText: {
      lineHeight: 30,
      fontSize: 18,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: theme.Spacing.sm,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: theme.Spacing.md,
    },
  })

  const handleAcceptPressed = async () => {
    logger.info('User accepted analytics opt-in')
    onPress()
    try {
      await Analytics.initializeTracker()
    } catch (error) {
      logger.error(
        'Failed to initialize analytics tracker on opt-in',
        {
          file: 'OnboardingOptInAnalyticsContent.tsx',
        },
        error as Error
      )
    }
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
  }
  const handleDeniedPressed = () => {
    logger.info('User denied analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
    onPress()
  }

  const controls = (
    <>
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
    </>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.sectionContainer}>
      <Image source={analytics} style={styles.imageContainer} />
      <View style={styles.titleContainer}>
        <ThemedText variant="headingOne">{t('BCSC.Onboarding.AnalyticsTitle')}</ThemedText>
      </View>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.AnalyticsHeader')}</ThemedText>
      <ThemedText style={styles.contentText}>{t('BCSC.Onboarding.AnalyticsContent')}</ThemedText>
    </ScreenWrapper>
  )
}
