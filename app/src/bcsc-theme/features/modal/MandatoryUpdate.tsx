import { getBCSCAppStoreUrl } from '@/utils/links'
import { TOKENS, useServices } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking, Platform } from 'react-native'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when a mandatory app update is required.
 *
 * @returns {*} {JSX.Element} The MandatoryUpdate component.
 */
export const MandatoryUpdate = (): JSX.Element => {
  const { t } = useTranslation()
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
      headerText={t('BCSC.Modals.MandatoryUpdate.Header')}
      contentText={[
        t('BCSC.Modals.MandatoryUpdate.ContentA'),
        t('BCSC.Modals.MandatoryUpdate.ContentB', { platformStore }),
      ]}
      buttonText={t('BCSC.Modals.MandatoryUpdate.UpdateButton', { platformStore })}
      onButtonPress={handleGoToStore}
    />
  )
}
