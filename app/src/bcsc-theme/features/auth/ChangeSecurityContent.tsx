import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { TOKENS, useServices } from '@bifold/core'
import { upperFirst } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AccountSecurityMethod,
  BiometricType,
  getAccountSecurityMethod,
  getAvailableBiometricType,
  setAccountSecurityMethod,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'

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
  const [deviceAuthMethodName, setDeviceAuthMethodName] = useState('')

  useEffect(() => {
    const loadDeviceAuthInfo = async () => {
      try {
        const biometricType = await getAvailableBiometricType()
        setDeviceAuthMethodName(biometricType === BiometricType.None ? 'Device Passcode' : upperFirst(biometricType))
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err)
        logger.error(`Error loading biometric type: ${errMessage}`)
        setDeviceAuthMethodName('Device Passcode')
      }
    }

    loadDeviceAuthInfo()
  }, [logger])

  useEffect(() => {
    const loadCurrentMethod = async () => {
      try {
        const method = await getAccountSecurityMethod()
        setCurrentMethod(method)
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err)
        logger.error(`Error loading security method: ${errMessage}`)
        emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.LoadMethodFailedMessage'))
      }
    }

    loadCurrentMethod()
  }, [logger, t, emitAlert])

  const handleDeviceAuthPress = useCallback(async () => {
    try {
      // In settings context, account already exists, so setupDeviceSecurity should work
      const { success } = await setupDeviceSecurity()
      if (!success) {
        logger.error('Device security setup failed')
        emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
        return
      }

      await setAccountSecurityMethod(AccountSecurityMethod.DeviceAuth)
      setCurrentMethod(AccountSecurityMethod.DeviceAuth)
      logger.info('Successfully switched to device authentication')

      Toast.show({
        type: 'success',
        text1: t('BCSC.Settings.AppSecurity.SuccessTitle'),
        text2: t('BCSC.Settings.AppSecurity.SwitchedToDeviceAuth', { method: deviceAuthMethodName }),
        position: 'bottom',
      })

      onDeviceAuthSuccess()
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err)
      logger.error(`Error setting account security method: ${errMessage}`)
      emitAlert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
    }
  }, [logger, t, deviceAuthMethodName, onDeviceAuthSuccess, emitAlert])

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
