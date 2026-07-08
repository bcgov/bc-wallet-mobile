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
   * Fired after "Continue" records that the intro has been seen. In the onboarding stack this
   * advances to the privacy policy. When the screen is shown as the one-time RootStack gate for
   * already-onboarded users it is omitted: marking the intro seen re-renders RootStack, which then
   * routes the user to their proper destination (auth, verify or main).
   */
  onContinue?: () => void
  /** Fired when the hidden developer-menu trigger activates. Omitted outside the onboarding stack. */
  onActivateDeveloper?: () => void
}

/**
 * First onboarding screen. Welcomes the user before the privacy/terms/PIN flow and hosts the
 * hidden developer-menu trigger (tap the illustration) so dev/QA can reach the developer (IAS
 * environment) menu before any registration happens.
 *
 * It is also shown once to every already-onboarded user (as a RootStack-level gate) so the app
 * refresh is announced to existing users. Continue records `SEEN_ONBOARDING_INTRO` so the screen
 * is not shown again on subsequent launches.
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
