import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import useLeaveVerification from '@/bcsc-theme/hooks/useLeaveVerification'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import AccountVerificationCta from '@assets/img/account-verification-cta.svg'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { Edges } from 'react-native-safe-area-context'

/**
 * One-time prompt shown after onboarding completes (PIN created) and before the
 * user enters the main app. Lets them choose to start identity verification now
 * or defer it until later. The choice is recorded via `SEEN_VERIFY_PROMPT` so
 * the screen is not shown again on subsequent launches.
 */
interface VerifyPromptScreenProps {
  showSkip?: boolean
  edges?: Edges
  /**
   * Optional callback fired right after "Continue" records the choice. When the prompt is the
   * entry screen of VerifyStack, this navigates (with a slide) to the next step within the same
   * navigator instead of relying on a RootStack stack swap, which would jump.
   */
  onContinue?: () => void
}

export const VerifyPromptScreen: React.FC<VerifyPromptScreenProps> = ({ showSkip = true, edges, onContinue }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [, dispatch] = useStore<BCState>()

  const leaveVerification = useLeaveVerification()

  const markPromptSeen = useCallback(() => {
    dispatch({ type: BCDispatchAction.SEEN_VERIFY_PROMPT, payload: [true] })
  }, [dispatch])

  const handleVerifyNow = useCallback(() => {
    markPromptSeen()
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS,
      payload: [VerificationStatus.IN_PROGRESS],
    })
    // These dispatches keep VerifyStack mounted (verification is now in progress), so onContinue
    // can navigate within it for a normal slide transition.
    onContinue?.()
  }, [dispatch, markPromptSeen, onContinue])

  const handleLater = useCallback(() => {
    markPromptSeen()
    leaveVerification()
  }, [markPromptSeen, leaveVerification])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        onPress={handleVerifyNow}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
      />
      {showSkip && (
        <Button
          buttonType={ButtonType.Secondary}
          title={t('BCSC.VerifyPrompt.SkipVerification')}
          onPress={handleLater}
          accessibilityLabel={t('BCSC.VerifyPrompt.SkipVerification')}
          testID={testIdWithKey('SkipVerification')}
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
            <ThemedText style={{ marginHorizontal: Spacing.sm }}>{'\u2022'}</ThemedText>
            <ThemedText style={{ flex: 1 }}>{line}</ThemedText>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  )
}
