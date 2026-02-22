import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppEventCode } from '@/events/appEventCode'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hook that provides a function to show a native alert dialog confirming account removal.
 * On confirmation, triggers a factory reset to remove the account.
 *
 * Uses a native alert dialog rather than navigating to a confirmation screen,
 * which avoids the stuck-screen issue caused by navigator tree swaps during factory reset.
 *
 * @returns A function that shows the remove account confirmation alert.
 */
export const useRemoveAccountAlert = () => {
  const { t } = useTranslation()
  const factoryReset = useFactoryReset()
  const { emitAlert } = useErrorAlert()
  const loadingScreen = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const showRemoveAccountAlert = useCallback(() => {
    emitAlert(t('Alerts.RemoveAccount.Title'), t('Alerts.RemoveAccount.Description'), {
      event: AppEventCode.REMOVE_ACCOUNT,
      actions: [
        {
          text: t('Global.Cancel'),
          style: 'cancel',
        },
        {
          text: t('Alerts.RemoveAccount.Action1'),
          style: 'destructive',
          onPress: async () => {
            try {
              loadingScreen.startLoading(t('BCSC.Account.RemoveAccountLoading'))

              logger.info('[RemoveAccount] User confirmed account removal, proceeding with verification reset')

              const result = await factoryReset()

              if (!result.success) {
                logger.error('[RemoveAccount] Failed to remove account', result.error)
              }
            } catch (error) {
              logger.error('[RemoveAccount] Error during account removal', error as Error)
            } finally {
              loadingScreen.stopLoading()
            }
          },
        },
      ],
    })
  }, [emitAlert, t, factoryReset, loadingScreen, logger])

  return showRemoveAccountAlert
}
