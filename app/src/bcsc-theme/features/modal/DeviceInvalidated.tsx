import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
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
export const DeviceInvalidated = (): JSX.Element => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    const result = await factoryReset({
      completedNewSetup: true,
      completedOnboarding: true,
      nicknames: store.bcsc.nicknames,
      selectedNickname: store.bcsc.selectedNickname,
    })

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger, store.bcsc.nicknames, store.bcsc.selectedNickname])

  return (
    <SystemModal
      iconName="phonelink-erase"
      headerText={t('BCSC.Modals.DeviceInvalidated.Header')}
      contentText={[t('BCSC.Modals.DeviceInvalidated.ContentA'), t('BCSC.Modals.DeviceInvalidated.ContentB')]}
      buttonText={t('BCSC.Modals.DeviceInvalidated.OKButton')}
      onButtonPress={handleFactoryReset}
    />
  )
}
