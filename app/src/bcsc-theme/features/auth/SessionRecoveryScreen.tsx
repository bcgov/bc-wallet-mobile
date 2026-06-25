import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useAlerts } from '@/hooks/useAlerts'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoadingScreen } from '../../contexts/BCSCLoadingContext'

/**
 * Shown when an account exists but both its registration and refresh tokens are unrecoverable
 */
export const SessionRecoveryScreen = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const factoryReset = useFactoryReset()
  const { factoryResetAlert } = useAlerts(navigation)
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onPressPrimaryAction = useCallback(async () => {
    const stopLoading = loadingScreen.startLoading(t('BCSC.SessionRecovery.Resetting'))
    try {
      const result = await factoryReset()
      if (!result.success) {
        logger.error('[SessionRecovery] Factory reset failed during lost-session recovery', result.error)
        factoryResetAlert(result.error)
      }
    } finally {
      stopLoading()
    }
  }, [loadingScreen, t, factoryReset, factoryResetAlert, logger])

  const controls = (
    <Button
      title={t('BCSC.SessionRecovery.PrimaryAction')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('SessionRecoveryReset')}
      accessibilityLabel={t('BCSC.SessionRecovery.PrimaryAction')}
      onPress={onPressPrimaryAction}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.md }}>
      <ThemedText variant="headingThree">{t('BCSC.SessionRecovery.Header')}</ThemedText>
      <ThemedText>{t('BCSC.SessionRecovery.Body')}</ThemedText>
      <ThemedText>{t('BCSC.SessionRecovery.BodyAction')}</ThemedText>
    </ScreenWrapper>
  )
}

export default SessionRecoveryScreen
