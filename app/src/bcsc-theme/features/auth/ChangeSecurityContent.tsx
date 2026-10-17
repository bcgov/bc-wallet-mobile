import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useWalletService } from '@/bcsc-theme/services/hooks/useWalletService'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AccountSecurityMethod,
  getAccountSecurityMethod,
  setAccountSecurityMethod,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'

export interface ChangeSecurityContentProps {
  onDeviceAuthSuccess: () => void
  onPINPress: () => void
}

/**
 * Shared ChangeSecurityContent component that can be used across different navigation stacks.
 * Allows users to toggle between PIN and biometric/device authentication.
 * Uses the shared SecurityMethodSelector component.
 */
export const ChangeSecurityContent = ({ onDeviceAuthSuccess, onPINPress }: ChangeSecurityContentProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitAlert } = useErrorAlert()
  const [store, dispatch] = useStore<BCState>()
  // Secure state already knows the method, so the current-method marker shows on the first render.
  const [currentMethod, setCurrentMethod] = useState<AccountSecurityMethod | null>(
    store.bcscSecure.securityMethod ?? null
  )
  const walletService = useWalletService()

  useEffect(() => {
    const loadCurrentMethod = async () => {
      try {
        const method = await getAccountSecurityMethod()
        setCurrentMethod(method)
      } catch (err) {
        const appError = toAppError(err, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
        logger.error(`Error loading security method: ${appError.technicalMessage ?? appError.message}`)
        emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
      }
    }

    loadCurrentMethod()
  }, [logger, t, emitAlert])

  const handleDeviceAuthPress = useCallback(async () => {
    try {
      // In settings context, account already exists, so setupDeviceSecurity should work
      const { success, walletKey } = await setupDeviceSecurity()
      if (!success) {
        logger.error('Device security setup failed')
        emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
        return
      }

      await setAccountSecurityMethod(AccountSecurityMethod.DeviceAuth)
      setCurrentMethod(AccountSecurityMethod.DeviceAuth)
      dispatch({ type: BCDispatchAction.UPDATE_SECURE_SECURITY_METHOD, payload: [AccountSecurityMethod.DeviceAuth] })
      logger.info('Successfully switched to device authentication')

      await walletService.rotateWalletKey(walletKey)

      onDeviceAuthSuccess()
    } catch (err) {
      const appError = toAppError(err, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
      logger.error(`Error setting account security method: ${appError.technicalMessage ?? appError.message}`)
      emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
    }
  }, [logger, walletService, onDeviceAuthSuccess, emitAlert, t, dispatch])

  return (
    <SecurityMethodSelector
      onDeviceAuthPress={handleDeviceAuthPress}
      onPINPress={onPINPress}
      currentMethod={currentMethod}
      deviceAuthPrompt={t('BCSC.Settings.AppSecurity.AuthenticateToSwitch')}
    />
  )
}
