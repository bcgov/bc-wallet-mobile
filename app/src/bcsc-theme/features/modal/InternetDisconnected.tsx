import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { TOKENS, useServices } from '@bifold/core'
import { useNetInfo } from '@react-native-community/netinfo'
import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when the device is disconnected from the internet.
 *
 * @returns {*} {JSX.Element} The InternetDisconnected component.
 */
export const InternetDisconnected = (): JSX.Element => {
  const navigation = useNavigation()
  const netInfo = useNetInfo()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

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
    <SystemModal
      iconName="wifi-off"
      headerKey="BCSC.Modals.InternetDisconnected.Header"
      contentKeys={['BCSC.Modals.InternetDisconnected.ContentA', 'BCSC.Modals.InternetDisconnected.ContentB']}
      buttonTitleKey="BCSC.Modals.InternetDisconnected.RetryButton"
      onButtonPress={handleRetry}
    />
  )
}
