import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Component displayed when the device has been invalidated.
 *
 * @returns {*} {JSX.Element} The DeviceInvalidated component.
 */

type DeviceInvalidatedProps = {
  route: {
    params: {
      caseType: BCSCReason
    }
  }
}

export const DeviceInvalidated = ({ route }: DeviceInvalidatedProps): JSX.Element => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const caseType = route.params.caseType
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    if (!caseType) {
      logger.warn('DeviceInvalidated: caseType is undefined')
    }
    const factoryResetParams: Partial<Record<BCSCReason, Record<string, unknown>>> = {
      // Can add more cases here for different BCSCReason types in the future
      [BCSCReason.CanceledByAgent]: {
        nicknames: store.bcsc.nicknames,
        selectedNickname: store.bcsc.selectedNickname,
      },
      [BCSCReason.CanceledByUser]: {}, // Empty for a 'new install state'
    }

    const result = await factoryReset((caseType && factoryResetParams[caseType]) ?? {})

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger, store.bcsc.nicknames, store.bcsc.selectedNickname, caseType])

  //
  const contentTextMap: Partial<Record<BCSCReason, string>> = {
    // Can add more cases here for different BCSCReason types in the future
    [BCSCReason.CanceledByAgent]: t('BCSC.Modals.DeviceInvalidated.CancelledByAgent'),
    [BCSCReason.CanceledByUser]: t('BCSC.Modals.DeviceInvalidated.CancelledByUser'),
  }
  return (
    <SystemModal
      iconName="phonelink-erase"
      headerText={t('BCSC.Modals.DeviceInvalidated.Header')}
      contentText={[contentTextMap[caseType]!, t('BCSC.Modals.DeviceInvalidated.ContentA')]}
      buttonText={t('BCSC.Modals.DeviceInvalidated.OKButton')}
      onButtonPress={handleFactoryReset}
    />
  )
}
