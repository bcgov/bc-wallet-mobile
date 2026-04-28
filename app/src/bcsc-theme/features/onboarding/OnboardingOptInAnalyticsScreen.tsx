import { Callout } from '@/bcsc-theme/components/Callout'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import AnalyticsIcon from '@assets/img/analytics-icon.svg'
import Blob from '@assets/img/blob.svg'
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
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'

interface OnboardingOptInAnalyticsScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingOptInAnalytics>
}

/**
 * Opt-In Analytics screen component that allows users to choose whether to participate in analytics data collection.
 * @returns {*} {React.ReactElement} The OnboardingOptInAnalyticsScreen component.
 */
export const OnboardingOptInAnalyticsScreen: React.FC<OnboardingOptInAnalyticsScreenProps> = ({
  navigation,
}: OnboardingOptInAnalyticsScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    imageContainer: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  const nextScreen = async () => {
    const status = await PushNotifications.status()

    // if permission is granted, skip notification screen
    if (status === PushNotifications.NotificationPermissionStatus.GRANTED) {
      return navigation.navigate(BCSCScreens.OnboardingSecureApp)
    }

    navigation.navigate(BCSCScreens.OnboardingNotifications)
  }

  const handleAcceptPressed = async () => {
    logger.info('User accepted analytics opt-in')
    nextScreen()
    try {
      await Analytics.initializeTracker(store.developer.environment.analyticsAppId)
      dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [true] })
    } catch (error) {
      logger.error(
        'Failed to initialize analytics tracker on opt-in',
        {
          file: 'OnboardingOptInAnalyticsScreen.tsx',
        },
        error as Error
      )
    }
  }

  const handleDeniedPressed = () => {
    logger.info('User denied analytics opt-in')
    dispatch({ type: BCDispatchAction.UPDATE_ANALYTICS_OPT_IN, payload: [false] })
    nextScreen()
  }

  const controls = (
    <ControlContainer>
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
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <View style={styles.imageContainer}>
        <Blob />
        <AnalyticsIcon style={{ position: 'absolute' }} />
      </View>
      <ThemedText variant="headingThree" style={{ textAlign: 'center' }}>
        {t('BCSC.Onboarding.AnalyticsTitle')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.AnalyticsHeader')}</ThemedText>
      <Callout>
        <ThemedText>{t('BCSC.Onboarding.AnalyticsContent')}</ThemedText>
        <ThemedText>{`\n${t('BCSC.Onboarding.AnalyticsAnonymousInfo')}`}</ThemedText>
      </Callout>
    </ScreenWrapper>
  )
}
