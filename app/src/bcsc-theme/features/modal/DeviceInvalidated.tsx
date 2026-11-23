import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCMainStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { TOKENS, useServices } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when the device has been invalidated.
 *
 * @returns {*} {React.ReactElement} The DeviceInvalidated component.
 */

type DeviceInvalidatedProps = StackScreenProps<BCSCMainStackParams, BCSCModals.DeviceInvalidated>

export const DeviceInvalidated = ({ route }: DeviceInvalidatedProps): React.ReactElement => {
  const { t } = useTranslation()
  const invalidationReason = route.params?.invalidationReason
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Handles the factory reset operation.
   */
  // Every reason resets to a new install. A cancelled card used to keep the nickname, but it lived on the
  // account profile the reset removes; the next verification names the account again.
  const handleFactoryReset = useCallback(async () => {
    const result = await factoryReset()

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger])

  const contentTextMap: Partial<Record<BCSCReason, string>> = {
    // Can add more cases here for different BCSCReason types in the future
    [BCSCReason.Cancel]: t('BCSC.Modals.DeviceInvalidated.CancelledByCardCancel'),
    [BCSCReason.CanceledByAgent]: t('BCSC.Modals.DeviceInvalidated.CancelledByAgent'),
    [BCSCReason.CanceledByUser]: t('BCSC.Modals.DeviceInvalidated.CancelledByUser'),
    [BCSCReason.CanceledByAdditionalCard]: t('BCSC.Modals.DeviceInvalidated.CanceledByAdditionalCard'),
    [BCSCReason.CanceledByCardTypeChange]: t('BCSC.Modals.DeviceInvalidated.CanceledByCardTypeChange'),
    [BCSCReason.CanceledDueToInactivity]: t('BCSC.Modals.DeviceInvalidated.CanceledDueToInactivity'),
  }

  return (
    <SystemModal
      iconName="phonelink-erase"
      headerText={t('BCSC.Modals.DeviceInvalidated.Header')}
      contentText={[
        contentTextMap[invalidationReason] ?? t('BCSC.Modals.DeviceInvalidated.CancelledByCardCancel'),
        t('BCSC.Modals.DeviceInvalidated.ContentA'),
      ]}
      buttonText={t('BCSC.Modals.DeviceInvalidated.OKButton')}
      onButtonPress={handleFactoryReset}
    />
  )
}
