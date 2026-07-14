import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useWalletService } from '@/bcsc-theme/services/hooks/useWalletService'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppVersion, isVersionAtLeast } from '@/utils/version'
import { TOKENS, useServices } from '@bifold/core'
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
  onLearnMorePress: () => void
}

/**
 * Shared ChangeSecurityContent component that can be used across different navigation stacks.
 * Allows users to toggle between PIN and biometric/device authentication.
 * Uses the shared SecurityMethodSelector component.
 */
export const ChangeSecurityContent = ({
  onDeviceAuthSuccess,
  onPINPress,
  onLearnMorePress,
}: ChangeSecurityContentProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { emitAlert } = useErrorAlert()
  const [currentMethod, setCurrentMethod] = useState<AccountSecurityMethod | null>(null)
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
      logger.info('Successfully switched to device authentication')

      const rotateSuccess = await walletService.rotateWalletKey(walletKey)

      // In V4.2.x, if the wallet key rotation fails, we should not proceed to the success callback.
      if (!rotateSuccess && isVersionAtLeast(AppVersion.V4_2_x)) {
        return
      }

      onDeviceAuthSuccess()
    } catch (err) {
      const appError = toAppError(err, ErrorRegistry.DEVICE_AUTHORIZATION_ERROR)
      logger.error(`Error setting account security method: ${appError.technicalMessage ?? appError.message}`)
      emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
    }
  }, [logger, walletService, onDeviceAuthSuccess, emitAlert, t])

  return (
    <SecurityMethodSelector
      onDeviceAuthPress={handleDeviceAuthPress}
      onPINPress={onPINPress}
      onLearnMorePress={onLearnMorePress}
      currentMethod={currentMethod}
      deviceAuthPrompt={t('BCSC.Settings.AppSecurity.AuthenticateToSwitch')}
    />
  )
}
