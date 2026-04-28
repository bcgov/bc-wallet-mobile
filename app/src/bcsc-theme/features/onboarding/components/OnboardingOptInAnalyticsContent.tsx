import { CardButton } from '@/bcsc-theme/components/CardButton'
import { ONBOARDING_ICON_IMAGE_SIZE } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import {
  Button,
  ButtonType,
  ContentGradient,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface OnboardingOptInAnalyticsContentProps {
  onPress: () => void
  onLearnMore: () => void
}
/**
 * Analytics Opt In content that informs users about the app's data collection practices.
 * @returns {*} {React.ReactElement} The OnboardingOptInAnalyticsContent component.
 */
export const OnboardingOptInAnalyticsContent: React.FC<OnboardingOptInAnalyticsContentProps> = ({
  onPress,
  onLearnMore,
}: OnboardingOptInAnalyticsContentProps): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    sectionContainer: {
      gap: Spacing.lg,
    },
    iconContainer: {
      alignItems: 'center',
      marginVertical: Spacing.md,
    },
    icon: {
      backgroundColor: ColorPalette.grayscale.white,
      borderRadius: Spacing.md,
    },
    titleContainer: {
      alignItems: 'center',
    },
  })

  const handleAcceptPressed = async () => {
    logger.info('User accepted analytics opt-in')
    onPress()
    try {
      await Analytics.initializeTracker(store.developer.environment.analyticsAppId)
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
    } catch (error) {
      logger.error(
        'Failed to initialize analytics tracker on opt-in',
        {
          file: 'OnboardingOptInAnalyticsContent.tsx',
        },
        error as Error
      )
    }
  }
  const handleDeniedPressed = () => {
    logger.info('User denied analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
    onPress()
  }

  const controls = (
    <View style={{ width: '100%', gap: Spacing.md }}>
      <ContentGradient backgroundColor={ColorPalette.brand.primaryBackground} />
      <Button
        title={t('BCSC.Onboarding.AcceptAnalytics')}
        buttonType={ButtonType.Primary}
        onPress={handleAcceptPressed}
        testID={testIdWithKey('Accept')}
      />
      <Button
        title={t('BCSC.Onboarding.DenyAnalytics')}
        buttonType={ButtonType.Secondary}
        onPress={handleDeniedPressed}
        testID={testIdWithKey('Decline')}
      />
    </View>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.sectionContainer}>
      <View style={styles.iconContainer}>
        <Icon
          name={'analytics'}
          size={ONBOARDING_ICON_IMAGE_SIZE}
          color={ColorPalette.brand.primaryBackground}
          style={styles.icon}
        />
      </View>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.AnalyticsHeader')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.AnalyticsContent')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.AnalyticsAnonymousInfo')}</ThemedText>
      <CardButton
        title={t('BCSC.Onboarding.LearnMore')}
        testID={testIdWithKey('LearnMore')}
        onPress={onLearnMore}
        endIcon="open-in-new"
      />
    </ScreenWrapper>
  )
}
