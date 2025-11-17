import { getBCSCAppStoreUrl } from '@/utils/links'
import { TOKENS, useServices } from '@bifold/core'
import { Linking, Platform } from 'react-native'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when a mandatory app update is required.
 *
 * @returns {*} {JSX.Element} The MandatoryUpdate component.
 */
export const MandatoryUpdate = (): JSX.Element => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const platformStore = Platform.OS === 'ios' ? 'App Store' : 'Google Play'

  const handleGoToStore = () => {
    try {
      Linking.openURL(getBCSCAppStoreUrl())
    } catch (error) {
      logger.error('MandatoryUpdate: Failed to open app store link.', error as Error)
    }
  }

  return (
    <SystemModal
      iconName="system-update"
      headerKey="BCSC.Modals.MandatoryUpdate.Header"
      contentKeys={['BCSC.Modals.MandatoryUpdate.ContentA', 'BCSC.Modals.MandatoryUpdate.ContentB']}
      buttonTitleKey="BCSC.Modals.MandatoryUpdate.UpdateButton"
      onButtonPress={handleGoToStore}
      translationParams={{ platformStore }}
    />
  )
}
