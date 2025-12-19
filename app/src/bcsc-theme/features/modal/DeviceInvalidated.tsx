import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCMainStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCSCState, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when the device has been invalidated.
 *
 * @returns {*} {JSX.Element} The DeviceInvalidated component.
 */

type DeviceInvalidatedProps = StackScreenProps<BCSCMainStackParams, BCSCModals.DeviceInvalidated>

export const DeviceInvalidated = ({ route }: DeviceInvalidatedProps): JSX.Element => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const invalidationReason = route.params.invalidationReason
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    if (!invalidationReason) {
      logger.warn('DeviceInvalidated: invalidationReason is undefined')
    }
    const factoryResetParams: Partial<Record<BCSCReason, Partial<BCSCState>>> = {
      // Can add more cases here for different BCSCReason types in the future
      [BCSCReason.CanceledByAgent]: {
        nicknames: store.bcsc.nicknames,
        selectedNickname: store.bcsc.selectedNickname,
      },
      [BCSCReason.CanceledByUser]: {}, // Empty for a 'new install state'
    }

    const result = await factoryReset(invalidationReason && factoryResetParams[invalidationReason])

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger, store.bcsc.nicknames, store.bcsc.selectedNickname, invalidationReason])

  const contentTextMap: Partial<Record<BCSCReason, string>> = {
    // Can add more cases here for different BCSCReason types in the future
    [BCSCReason.CanceledByAgent]: t('BCSC.Modals.DeviceInvalidated.CancelledByAgent'),
    [BCSCReason.CanceledByUser]: t('BCSC.Modals.DeviceInvalidated.CancelledByUser'),
  }

  return (
    <SystemModal
      iconName="phonelink-erase"
      headerText={t('BCSC.Modals.DeviceInvalidated.Header')}
      contentText={[contentTextMap[invalidationReason]!, t('BCSC.Modals.DeviceInvalidated.ContentA')]}
      buttonText={t('BCSC.Modals.DeviceInvalidated.OKButton')}
      onButtonPress={handleFactoryReset}
    />
  )
}
