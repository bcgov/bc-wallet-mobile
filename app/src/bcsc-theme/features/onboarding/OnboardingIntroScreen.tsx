import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { DeveloperModeTrigger } from '@/bcsc-theme/components/DeveloperModeTrigger'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HELP_URL } from '@/constants'
import WelcomeIllustration from '@assets/img/welcome_phone.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface OnboardingIntroScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingIntro>
}

/**
 * First onboarding screen. Welcomes the user before the privacy/terms/PIN flow and hosts the
 * hidden developer-menu trigger (tap the illustration) so dev/QA can reach the developer (IAS
 * environment) menu before any registration happens.
 *
 * @returns {*} {React.ReactElement} The OnboardingIntroScreen component.
 */
export const OnboardingIntroScreen = ({ navigation }: OnboardingIntroScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const handleContinue = useCallback(() => {
    navigation.navigate(BCSCScreens.OnboardingPrivacyPolicy)
  }, [navigation])

  const handleLearnMore = useCallback(() => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Screens.HelpCentre'),
      url: HELP_URL,
    })
  }, [navigation, t])

  const styles = StyleSheet.create({
    image: {
      marginTop: Spacing.xxl,
      alignItems: 'center',
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        onPress={handleContinue}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.Onboarding.LearnMore')}
        onPress={handleLearnMore}
        accessibilityLabel={t('BCSC.Onboarding.LearnMore')}
        testID={testIdWithKey('LearnMore')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <DeveloperModeTrigger onActivate={() => navigation.navigate(BCSCScreens.OnboardingDeveloper)}>
        <View style={styles.image}>
          <WelcomeIllustration width={200} height={187} />
        </View>
      </DeveloperModeTrigger>
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', color: ColorPalette.brand.primary }}>
        {t('BCSC.Onboarding.IntroTitle')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.IntroDescription')}</ThemedText>
    </ScreenWrapper>
  )
}
