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
      alignItems: 'center',
    },
    icon: {
      paddingVertical: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  /**
   * Handler for the retry button press to re-check internet connectivity.
   *
   * Note: There is a listener elsewhere in the app that will also handle connectivity changes.
   * That listener will automatically close this modal when connectivity is restored.
   *
   * @returns {void}
   */
  const handleRetry = useCallback(() => {
    const internetStatusCheck = new InternetStatusSystemCheck(netInfo, navigation, logger)

    if (internetStatusCheck.runCheck()) {
      internetStatusCheck.onSuccess()
    }
  }, [logger, navigation, netInfo])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="wifi-off" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{t('BCSC.Modals.InternetDisconnected.Header')}</ThemedText>
          <ThemedText style={styles.textContent}>{t('BCSC.Modals.InternetDisconnected.ContentA')}</ThemedText>
          <ThemedText style={styles.textContent}>{t('BCSC.Modals.InternetDisconnected.ContentB')}</ThemedText>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.Modals.InternetDisconnected.RetryButton')}
          buttonType={ButtonType.Primary}
          onPress={handleRetry}
        />
      </View>
    </SafeAreaView>
  )
}
