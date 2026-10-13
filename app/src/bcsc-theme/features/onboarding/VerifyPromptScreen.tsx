import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { ServiceOutage } from '@/bcsc-theme/features/modal/ServiceOutage'
import { useLeaveVerification } from '@/bcsc-theme/hooks/useLeaveVerification'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCDispatchAction, BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import AccountVerificationCta from '@assets/img/account-verification-cta.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { Edges } from 'react-native-safe-area-context'

/**
 * Prompt shown after onboarding completes (PIN created) and before the user enters the main app.
 * Lets them choose to start identity verification now or defer it until later. It stays the root of
 * the verify stack for a user who chose to verify, so backing out of the first step returns here.
 * Also reachable from the main app (without the skip button) for a user who deferred.
 */
interface VerifyPromptScreenProps {
  showSkip?: boolean
  edges?: Edges
  /**
   * Fired when either button is pressed, marking the one-time prompt answered for this session.
   * Set by VerifyStack; the main-app copy of this screen has nothing to dismiss.
   */
  onAnswered?: () => void
  /**
   * Optional callback fired right after "Continue". When the prompt is the entry screen of
   * VerifyStack, this navigates (with a slide) to the next step within the same navigator
   * instead of relying on a RootStack stack swap, which would jump.
   */
  onContinue?: () => void
}

export const VerifyPromptScreen: React.FC<VerifyPromptScreenProps> = ({
  showSkip = true,
  edges,
  onAnswered,
  onContinue,
}) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { continueVerificationProcess } = useSecureActions()
  const leaveVerification = useLeaveVerification()
  // Startup seeds server status; the ServiceOutage screen's "Check again" force-refreshes it, so
  // no on-focus re-check is needed here.
  const { isAvailable, isChecking, serverStatus } = useServerStatus()

  const handleVerifyNow = useCallback(() => {
    onAnswered?.()
    // Only a copy that offers Skip is answering the prompt. The main-app copy is entered from Home, so
    // it leaves the answer given after onboarding as it was
    if (showSkip) {
      dispatch({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED, payload: [false] })
    }
    // Entering verification sets it in progress, which keeps VerifyStack mounted, so onContinue can
    // navigate within it for a normal slide transition.
    continueVerificationProcess()
    onContinue?.()
  }, [continueVerificationProcess, dispatch, onAnswered, onContinue, showSkip])

  const handleLater = useCallback(() => {
    onAnswered?.()
    dispatch({ type: BCDispatchAction.SET_VERIFICATION_SKIPPED, payload: [true] })
    // A first-time verifier who walked back here from the first step is still IN_PROGRESS, which alone
    // keeps VerifyStack mounted; skipping is their way to Home, so leave the flow as well (a no-op at the
    // fresh prompt, where nothing is in progress yet). Progress is kept for the Home card
    leaveVerification()
  }, [dispatch, leaveVerification, onAnswered])

  if (serverStatus === null && isChecking) {
    return <WaitingScreenContent message={t('BCSC.Loading.DefaultMessage')} />
  }

  // Rendered inline rather than navigated to: on a fresh launch this screen mounts in the same
  // commit as VerifyStack, and a navigate from a mount effect is dropped by the navigator's init.
  if (!isAvailable) {
    return <ServiceOutage onSkipVerification={showSkip ? handleLater : undefined} />
  }

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        onPress={handleVerifyNow}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(TestIds.onboarding.verifyPrompt.continue)}
      />
      {showSkip && (
        <Button
          buttonType={ButtonType.Secondary}
          title={t('BCSC.VerifyPrompt.SkipVerification')}
          onPress={handleLater}
          accessibilityLabel={t('BCSC.VerifyPrompt.SkipVerification')}
          testID={testIdWithKey(TestIds.onboarding.verifyPrompt.skipVerification)}
        />
      )}
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={edges}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <AccountVerificationCta width={120} height={120} />
      </View>
      <ThemedText variant="headingThree" style={{ color: ColorPalette.brand.primary, textAlign: 'center' }}>
        {t('BCSC.VerifyPrompt.Title')}
      </ThemedText>
      <ThemedText>{t('BCSC.VerifyPrompt.Description')}</ThemedText>
      <View>
        <ThemedText variant={'bold'}>{t('BCSC.VerifyPrompt.YouWillNeedTo')}</ThemedText>
        {[
          t('BCSC.VerifyPrompt.Bullet1'),
          t('BCSC.VerifyPrompt.Bullet2'),
          t('BCSC.VerifyPrompt.Bullet3'),
          t('BCSC.VerifyPrompt.Bullet4'),
        ].map((line, i) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            <ThemedText style={{ marginHorizontal: Spacing.sm }}>{'•'}</ThemedText>
            <ThemedText style={{ flex: 1 }}>{line}</ThemedText>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  )
}
