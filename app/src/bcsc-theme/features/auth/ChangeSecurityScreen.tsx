import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import {
  AccountSecurityMethod,
  getAccountSecurityMethod,
  setAccountSecurityMethod,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'

interface ChangeSecurityScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainAppSecurity>
}

/**
 * App Security screen for settings.
 * Allows users to toggle between PIN and biometric/device authentication.
 * Uses the shared SecurityMethodSelector component.
 */
export const ChangeSecurityScreen: React.FC<ChangeSecurityScreenProps> = ({
  navigation,
}: ChangeSecurityScreenProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { error } = useErrorAlert()
  const [currentMethod, setCurrentMethod] = useState<AccountSecurityMethod | null>(null)
  const deviceAuthMethodName = useMemo(() => {
    return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint'
  }, [])

  useEffect(() => {
    const loadCurrentMethod = async () => {
      try {
        const method = await getAccountSecurityMethod()
        setCurrentMethod(method)
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err)
        logger.error(`Error loading security method: ${errMessage}`)
        error(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
      }
    }

    loadCurrentMethod()
  }, [logger, error, t])

  const handleDeviceAuthPress = useCallback(async () => {
    try {
      // In settings context, account already exists, so setupDeviceSecurity should work
      const { success } = await setupDeviceSecurity()
      if (!success) {
        logger.error('Device security setup failed')
        error(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
        return
      }

      await setAccountSecurityMethod(AccountSecurityMethod.DeviceAuth)
      setCurrentMethod(AccountSecurityMethod.DeviceAuth)
      logger.info('Successfully switched to device authentication')

      navigation.goBack()

      Toast.show({
        type: 'success',
        text1: t('BCSC.Settings.AppSecurity.SuccessTitle'),
        text2: t('BCSC.Settings.AppSecurity.SwitchedToDeviceAuth', { method: deviceAuthMethodName }),
        position: 'bottom',
      })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err)
      logger.error(`Error setting account security method: ${errMessage}`)
      error(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
    }
  }, [error, logger, navigation, t, deviceAuthMethodName])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.MainChangePIN)
  }, [navigation])

  const handleLearnMorePress = useCallback(() => {
    navigation.navigate(BCSCScreens.MainWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }, [navigation, t])

  return (
    <SecurityMethodSelector
      onDeviceAuthPress={handleDeviceAuthPress}
      onPINPress={handlePINPress}
      onLearnMorePress={handleLearnMorePress}
      currentMethod={currentMethod}
      deviceAuthPrompt={t('BCSC.Settings.AppSecurity.AuthenticateToSwitch')}
    />
  )
}
