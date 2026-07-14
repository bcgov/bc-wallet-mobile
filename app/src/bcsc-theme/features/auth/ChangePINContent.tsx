import { ChangePINForm } from '@/bcsc-theme/features/auth/components/ChangePINForm'
import { PINEntryForm, PINEntryResult } from '@/bcsc-theme/features/auth/components/PINEntryForm'
import { useWalletService } from '@/bcsc-theme/services/hooks/useWalletService'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setAccountSecurityMethod } from 'react-native-bcsc-core'

export interface ChangePINContentProps {
  isChangingExistingPIN: boolean
  onChangePINSuccess: () => void
  onCreatePINSuccess: () => void
}

/**
 * Shared ChangePIN content component that can be used across different navigation stacks.
 * Handles two use cases:
 * 1. Switching from Device Auth to PIN (isChangingExistingPIN = false)
 *    - Uses PINEntryForm (new PIN + confirm)
 * 2. Changing an existing PIN (isChangingExistingPIN = true)
 *    - Uses ChangePINForm (current PIN + new PIN + confirm)
 */
export const ChangePINContent = ({
  isChangingExistingPIN,
  onChangePINSuccess,
  onCreatePINSuccess,
}: ChangePINContentProps) => {
  const { t } = useTranslation()
  const walletService = useWalletService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // Handler for when user is changing their existing PIN
  const handleChangePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      logger.info('PIN changed successfully')

      await walletService.rotateWalletKey(result.walletKey)

      onChangePINSuccess()
    },
    [logger, walletService, onChangePINSuccess]
  )

  // Handler for when user is switching from Device Auth to PIN
  const handleCreatePINSuccess = useCallback(
    async (result: PINEntryResult) => {
      const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
      await setAccountSecurityMethod(
        isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
      )

      logger.info('Switched to PIN security method')

      await walletService.rotateWalletKey(result.walletKey)

      onCreatePINSuccess()
    },
    [logger, walletService, onCreatePINSuccess]
  )

  // Render ChangePINForm when changing existing PIN, PINEntryForm when switching from Device Auth
  if (isChangingExistingPIN) {
    return <ChangePINForm onSuccess={handleChangePINSuccess} loadingMessage={t('BCSC.ChangePIN.ChangingPIN')} />
  }

  return (
    <PINEntryForm
      onSuccess={handleCreatePINSuccess}
      loadingMessage={t('BCSC.PIN.SettingUpPIN')}
      translationPrefix="BCSC.PIN"
    />
  )
}
