import { Callout } from '@/bcsc-theme/components/Callout'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { DeveloperModeTrigger } from '@/bcsc-theme/components/DeveloperModeTrigger'
import { BCDispatchAction, BCState } from '@/store'
import WelcomeIllustration from '@assets/img/welcome_phone.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface OnboardingIntroScreenProps {
  /**
   * Fired after "Continue" records that the intro has been seen. In OnboardingStack this advances a
   * new user to the privacy policy; in AuthStack it slides an already-onboarded user to the unlock
   * screen (see the respective navigators).
   */
  onContinue?: () => void
  /** Fired when the hidden developer-menu trigger activates (tap the illustration). */
  onActivateDeveloper?: () => void
}

/**
 * Welcome/intro screen shown before the privacy/terms/PIN flow. Hosts the hidden developer-menu
 * trigger (tap the illustration) so dev/QA can reach the developer (IAS environment) menu.
 *
 * It appears in two navigators: as the first screen of OnboardingStack for new users, and once to
 * every already-onboarded user on launch via AuthStack's AuthIntro route (announcing the app
 * refresh). Continue records `SEEN_ONBOARDING_INTRO` so it is not shown again on later launches.
 *
 * @returns {*} {React.ReactElement} The OnboardingIntroScreen component.
 */
export const OnboardingIntroScreen = ({ onContinue, onActivateDeveloper }: OnboardingIntroScreenProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [, dispatch] = useStore<BCState>()

  const handleContinue = useCallback(() => {
    dispatch({ type: BCDispatchAction.SEEN_ONBOARDING_INTRO, payload: [true] })
    onContinue?.()
  }, [dispatch, onContinue])

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
      <DeveloperModeTrigger onActivate={() => onActivateDeveloper?.()}>
        <View style={styles.image}>
          <WelcomeIllustration width={200} height={187} />
        </View>
      </DeveloperModeTrigger>
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', color: ColorPalette.brand.primary }}>
        {t('BCSC.Onboarding.IntroTitle')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.Onboarding.IntroDescription')}</ThemedText>
      <Callout>
        <ThemedText variant={'bold'} style={{ marginBottom: Spacing.sm }}>
          {t('BCSC.Onboarding.IntroCalloutTitle')}
        </ThemedText>
        <ThemedText>{t('BCSC.Onboarding.IntroCalloutBody')}</ThemedText>
      </Callout>
    </ScreenWrapper>
  )
}
