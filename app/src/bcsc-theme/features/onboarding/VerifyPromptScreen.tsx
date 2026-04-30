import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCDispatchAction, BCState, VerificationStatus } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import AccountCircle from '@assets/img/account_circle.svg'
import Blob from '@assets/img/blob.svg'
import VerifiedCheck from '@assets/img/verified.svg'

/**
 * One-time prompt shown after onboarding completes (PIN created) and before the
 * user enters the main app. Lets them choose to start identity verification now
 * or defer it until later. The choice is recorded via `SEEN_VERIFY_PROMPT` so
 * the screen is not shown again on subsequent launches.
 */
export const VerifyPromptScreen: React.FC = () => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [, dispatch] = useStore<BCState>()

  const markPromptSeen = useCallback(() => {
    dispatch({ type: BCDispatchAction.SEEN_VERIFY_PROMPT, payload: [true] })
  }, [dispatch])

  const handleVerifyNow = useCallback(() => {
    markPromptSeen()
    dispatch({
      type: BCDispatchAction.UPDATE_SECURE_VERIFIED_STATUS,
      payload: [VerificationStatus.IN_PROGRESS],
    })
  }, [dispatch, markPromptSeen])

  const handleLater = useCallback(() => {
    markPromptSeen()
  }, [markPromptSeen])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        onPress={handleVerifyNow}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('Global.Skip')}
        onPress={handleLater}
        accessibilityLabel={t('Global.Skip')}
        testID={testIdWithKey('Skip')}
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
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Blob height={120} width={120} />
        <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
          <AccountCircle height={100} width={100} />
          <VerifiedCheck style={{ position: 'absolute', bottom: '5%', right: '10%' }} />
        </View>
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
