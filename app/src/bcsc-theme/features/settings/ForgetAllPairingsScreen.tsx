import useApi from '@/bcsc-theme/api/hooks/useApi'
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
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    container: {
      flex: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
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
        text1: t('Unified.ForgetAllPairings.SuccessTitle'),
        text2: t('Unified.ForgetAllPairings.SuccessMessage'),
        position: 'bottom',
      })

      navigation.goBack()
    } catch (error) {
      logger.error('Error forgetting all pairings', error instanceof Error ? error : new Error(String(error)))
      Toast.show({
        type: 'error',
        text1: t('Unified.ForgetAllPairings.ErrorTitle'),
        text2: t('Unified.ForgetAllPairings.ErrorMessage'),
        position: 'bottom',
      })
    } finally {
      setIsLoading(false)
    }
  }, [navigation, pairing, t, logger])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText variant={'headingThree'}>{t('Unified.ForgetAllPairings.Title')}</ThemedText>

        <ThemedText>{t('Unified.ForgetAllPairings.Description1')}</ThemedText>

        <ThemedText>{t('Unified.ForgetAllPairings.Description2')}</ThemedText>
      </ScrollView>

      <Button
        title={t('Unified.ForgetAllPairings.ButtonTitle')}
        buttonType={ButtonType.Primary}
        onPress={handleForgetAllPairings}
        testID={testIdWithKey('ForgetAllPairings')}
        accessibilityLabel={t('Unified.ForgetAllPairings.ButtonTitle')}
        disabled={isLoading}
      >
        {isLoading && <ButtonLoading />}
      </Button>
    </SafeAreaView>
  )
}
