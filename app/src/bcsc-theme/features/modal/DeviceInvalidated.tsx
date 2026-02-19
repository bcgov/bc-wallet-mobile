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
 * @returns {*} {React.ReactElement} The DeviceInvalidated component.
 */

type DeviceInvalidatedProps = StackScreenProps<BCSCMainStackParams, BCSCModals.DeviceInvalidated>

export const DeviceInvalidated = ({ route }: DeviceInvalidatedProps): React.ReactElement => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const invalidationReason = route.params?.invalidationReason
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    const factoryResetParams: Partial<Record<BCSCReason, Partial<BCSCState>>> = {
      // Can add more cases here for different BCSCReason types in the future
      [BCSCReason.Cancel]: {
        nicknames: store.bcsc.nicknames,
        selectedNickname: store.bcsc.selectedNickname,
      },
      [BCSCReason.CanceledByAgent]: {
        nicknames: store.bcsc.nicknames,
        selectedNickname: store.bcsc.selectedNickname,
      },
      [BCSCReason.CanceledByUser]: {}, // Empty for a 'new install state'
      [BCSCReason.CanceledByAdditionalCard]: {},
    }

    const result = await factoryReset(factoryResetParams[invalidationReason])

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger, store.bcsc.nicknames, store.bcsc.selectedNickname, invalidationReason])

  const contentTextMap: Partial<Record<BCSCReason, string>> = {
    // Can add more cases here for different BCSCReason types in the future
    [BCSCReason.Cancel]: t('BCSC.Modals.DeviceInvalidated.CancelledByCardCancel'),
    [BCSCReason.CanceledByAgent]: t('BCSC.Modals.DeviceInvalidated.CancelledByAgent'),
    [BCSCReason.CanceledByUser]: t('BCSC.Modals.DeviceInvalidated.CancelledByUser'),
    [BCSCReason.CanceledByAdditionalCard]: t('BCSC.Modals.DeviceInvalidated.CanceledByAdditionalCard'),
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
