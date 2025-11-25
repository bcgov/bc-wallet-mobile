import useApi from '@/bcsc-theme/api/hooks/useApi'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
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
import Toast from 'react-native-toast-message'

interface ForgetAllPairingsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ForgetAllPairings>
}

/**
 * Forget All Pairings screen component that allows users to unpair their device from all previously paired computers
 *
 * @returns {*} {JSX.Element}
 */
export const ForgetAllPairingsScreen = ({ navigation }: ForgetAllPairingsScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { pairing } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    scrollContainer: {
      gap: Spacing.lg,
    },
  })

  const handleForgetAllPairings = useCallback(async () => {
    try {
      setIsLoading(true)

      await pairing.forgetAllPairings()

      Toast.show({
        type: 'success',
        text1: t('BCSC.ForgetAllPairings.SuccessTitle'),
        text2: t('BCSC.ForgetAllPairings.SuccessMessage'),
        position: 'bottom',
      })

      navigation.goBack()
    } catch (error) {
      logger.error('Error forgetting all pairings', error instanceof Error ? error : new Error(String(error)))
      Toast.show({
        type: 'error',
        text1: t('BCSC.ForgetAllPairings.ErrorTitle'),
        text2: t('BCSC.ForgetAllPairings.ErrorMessage'),
        position: 'bottom',
      })
    } finally {
      setIsLoading(false)
    }
  }, [navigation, pairing, t, logger])

  const controls = (
    <Button
      title={t('BCSC.ForgetAllPairings.ButtonTitle')}
      buttonType={ButtonType.Primary}
      onPress={handleForgetAllPairings}
      testID={testIdWithKey('ForgetAllPairings')}
      accessibilityLabel={t('BCSC.ForgetAllPairings.ButtonTitle')}
      disabled={isLoading}
    >
      {isLoading && <ButtonLoading />}
    </Button>
  )

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <ThemedText variant={'headingThree'}>{t('BCSC.ForgetAllPairings.Title')}</ThemedText>

      <ThemedText>{t('BCSC.ForgetAllPairings.Description1')}</ThemedText>

      <ThemedText>{t('BCSC.ForgetAllPairings.Description2')}</ThemedText>
    </ScreenWrapper>
  )
}
