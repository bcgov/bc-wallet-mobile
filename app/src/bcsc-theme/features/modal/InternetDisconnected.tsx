import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

/**
 * Component displayed when the device is disconnected from the internet.
 *
 * @returns {*} {JSX.Element} The InternetDisconnected component.
 */
export const InternetDisconnected = (): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const navigation = useNavigation()
  const netInfo = useNetInfo()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
    },
  })

  /**
   * Handler for the retry button press, which rechecks internet connectivity.
   *
   * Note: There is a listener elsewhere in the app that will also handle connectivity changes.
   * Which will automatically close this modal when connectivity is restored.
   *
   * @returns {void}
   */
  const handleRetry = useCallback(() => {
    const internetStatusCheck = new InternetStatusSystemCheck(netInfo, navigation as any, logger)

    if (internetStatusCheck.runCheck()) {
      internetStatusCheck.onSuccess()
    }
  }, [logger, navigation, netInfo])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="wifi-off" size={64} />
        <ThemedText variant="headingThree">{t('Modals.InternetDisconnected.Header')}</ThemedText>
        <ThemedText>{t('Modals.InternetDisconnected.ContentA')}</ThemedText>
        <ThemedText>{t('Modals.InternetDisconnected.ContentB')}</ThemedText>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('Modals.InternetDisconnected.RetryButton')}
          buttonType={ButtonType.Primary}
          onPress={handleRetry}
        />
      </View>
    </SafeAreaView>
  )
}
