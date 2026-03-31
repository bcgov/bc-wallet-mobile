import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { TOKENS, useServices } from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when the device is disconnected from the internet.
 *
 * @returns {*} {React.ReactElement} The InternetDisconnected component.
 */
export const InternetDisconnected = (): React.ReactElement => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { isConnected, isInternetReachable } = useNetInfo()

  /**
   * Handler for the retry button press to re-check internet connectivity.
   *
   * Note: There is a listener elsewhere in the app that will also handle connectivity changes.
   * That listener will automatically close this modal when connectivity is restored.
   *
   * @returns {void}
   */
  const handleRetry = useCallback(async () => {
    const internetStatusCheck = new InternetStatusSystemCheck(isConnected, isInternetReachable, navigation, logger)

    if (internetStatusCheck.runCheck()) {
      internetStatusCheck.onSuccess()
    }
  }, [isConnected, isInternetReachable, logger, navigation])

  useEffect(() => {
    handleRetry()
  }, [handleRetry])

  return (
    <SystemModal
      iconName="wifi-off"
      headerText={t('BCSC.Modals.InternetDisconnected.Header')}
      contentText={[t('BCSC.Modals.InternetDisconnected.ContentA'), t('BCSC.Modals.InternetDisconnected.ContentB')]}
      buttonText={t('BCSC.Modals.InternetDisconnected.RetryButton')}
      onButtonPress={handleRetry}
    />
  )
}
