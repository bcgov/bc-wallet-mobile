import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  usePreventDoublePress,
  useTheme,
} from '@bifold/core'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
import useCancelledReviewViewModel from './CancelledReviewViewModel'

interface CancelledReviewProps {
  route: {
    params: {
      agentReason?: string
    }
  }
}
const CancelledReview = ({ route }: CancelledReviewProps) => {
  const { agentReason } = route.params
  const verificationReset = useVerificationReset()
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { cleanUpVerificationData, resumeVerification, retryWithNewVideo } = useCancelledReviewViewModel()
  const { preventDoublePress, isPressing } = usePreventDoublePress()
  const loadingScreen = useLoadingScreen()

  usePreventGestureBack()

  useEffect(() => {
    cleanUpVerificationData()
  }, [cleanUpVerificationData])

  const styles = StyleSheet.create({
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    buttonIcon: {
      marginRight: Spacing.sm,
    },
  })

  const onPressRestart = preventDoublePress(async () => {
    const stopLoading = loadingScreen.startLoading(t('Alerts.RestartVerification.Loading'))
    try {
      // Signals failure by returning false (with its own alert), never by throwing.
      const success = await verificationReset()
      if (success) {
        // Leaves via store state, not navigation: each stack registers this screen under its
        // own route name, so the RootStack swap drops it and lands on the new initialRouteName.
        resumeVerification()
      }
    } finally {
      stopLoading()
    }
  })

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.CancelledVerification.RetryButton')}
        buttonType={ButtonType.Secondary}
        onPress={preventDoublePress(retryWithNewVideo)}
        disabled={isPressing}
        accessibilityLabel={t('BCSC.CancelledVerification.RetryButton')}
        testID={testIdWithKey('RetryWithNewVideo')}
      >
        <MaterialIcon name={'sensor-occupied'} size={24} color={ColorPalette.brand.primary} style={styles.buttonIcon} />
      </Button>
      <Button
        title={t('BCSC.CancelledVerification.RestartButton')}
        buttonType={ButtonType.Secondary}
        onPress={onPressRestart}
        disabled={isPressing}
        accessibilityLabel={t('BCSC.CancelledVerification.RestartButton')}
        testID={testIdWithKey('RestartVerification')}
      >
        <CommunityIcon name={'restore'} size={24} color={ColorPalette.brand.primary} style={styles.buttonIcon} />
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.content}
    >
      <ThemedText variant="headingThree">{t('BCSC.CancelledVerification.Title')}</ThemedText>
      <ThemedText>
        {t('BCSC.CancelledVerification.Label', {
          reason: agentReason ?? t('BCSC.CancelledVerification.NoReason'),
          interpolation: { escapeValue: false }, // this allows special characters to be rendered properly
        })}
      </ThemedText>
    </ScreenWrapper>
  )
}

export default CancelledReview
