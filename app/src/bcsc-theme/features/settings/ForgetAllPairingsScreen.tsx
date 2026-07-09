import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

interface ForgetAllPairingsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ForgetAllPairings>
}

/**
 * Forget All Pairings screen component that allows users to unpair their device from all previously paired computers
 *
 * @returns {*} {React.ReactElement}
 */
export const ForgetAllPairingsScreen = ({ navigation }: ForgetAllPairingsScreenProps): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { pairing } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { forgetPairingsAlert, unknownErrorModal } = useAlerts(navigation)

  const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      gap: Spacing.md,
      padding: Spacing.lg,
    },
  })

  const handleForgetAllPairings = useCallback(async () => {
    try {
      setIsLoading(true)

      await pairing.forgetAllPairings()

      forgetPairingsAlert()

      navigation.goBack()
    } catch (error) {
      logger.error('Error forgetting all pairings', error instanceof Error ? error : new Error(String(error)))
      unknownErrorModal(error)
    } finally {
      setIsLoading(false)
    }
  }, [pairing, forgetPairingsAlert, navigation, logger, unknownErrorModal])

  const controls = (
    <ControlContainer>
      <Button
        title={t('BCSC.ForgetAllPairings.ButtonTitle')}
        buttonType={ButtonType.Critical}
        onPress={handleForgetAllPairings}
        testID={testIdWithKey('ForgetAllPairings')}
        accessibilityLabel={t('BCSC.ForgetAllPairings.ButtonTitle')}
        disabled={isLoading}
      >
        {isLoading && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer} padded={false}>
      <ThemedText variant={'headingThree'}>{t('BCSC.ForgetAllPairings.Title')}</ThemedText>

      <ThemedText>{t('BCSC.ForgetAllPairings.Description1')}</ThemedText>

      <ThemedText>{t('BCSC.ForgetAllPairings.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}
