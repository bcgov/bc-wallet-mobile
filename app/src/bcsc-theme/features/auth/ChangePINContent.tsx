import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { ChangePINForm } from '@/bcsc-theme/features/auth/components/ChangePINForm'
import { PINEntryForm } from '@/bcsc-theme/features/auth/components/PINEntryForm'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setAccountSecurityMethod } from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'

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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { stopLoading } = useLoadingScreen()

  // Handler for when user is changing their existing PIN
  const handleChangePINSuccess = useCallback(async () => {
    logger.info('PIN changed successfully')
    stopLoading()

    Toast.show({
      type: 'success',
      text1: t('BCSC.Settings.ChangePIN.SuccessTitle'),
      text2: t('BCSC.Settings.ChangePIN.PINChanged'),
      position: 'bottom',
    })

    onChangePINSuccess()
  }, [logger, stopLoading, t, onChangePINSuccess])

  // Handler for when user is switching from Device Auth to PIN
  const handleCreatePINSuccess = useCallback(async () => {
    const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
    await setAccountSecurityMethod(
      isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
    )

    logger.info('Switched to PIN security method')
    stopLoading()

    Toast.show({
      type: 'success',
      text1: t('BCSC.Settings.AppSecurity.SuccessTitle'),
      text2: t('BCSC.Settings.AppSecurity.SwitchedToPIN'),
      position: 'bottom',
    })

    onCreatePINSuccess()
  }, [logger, stopLoading, t, onCreatePINSuccess])

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
