import { SecurityMethodSelector } from '@/bcsc-theme/features/auth/components/SecurityMethodSelector'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform } from 'react-native'
import { AccountSecurityMethod, getAccountSecurityMethod, setAccountSecurityMethod } from 'react-native-bcsc-core'

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
  const [currentMethod, setCurrentMethod] = useState<AccountSecurityMethod | null>(null)
  const deviceAuthMethodName = useMemo(() => {
    return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint'
  }, [])

  useEffect(() => {
    const loadCurrentMethod = async () => {
      try {
        const method = await getAccountSecurityMethod()
        setCurrentMethod(method)
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Error loading security method: ${errMessage}`)
      }
    }

    loadCurrentMethod()
  }, [logger])

  const handleDeviceAuthSuccess = useCallback(async () => {
    try {
      await setAccountSecurityMethod(AccountSecurityMethod.DeviceAuth)
      setCurrentMethod(AccountSecurityMethod.DeviceAuth)
      logger.info('Successfully switched to device authentication')

      Alert.alert(
        t('BCSC.Settings.AppSecurity.SuccessTitle'),
        t('BCSC.Settings.AppSecurity.SwitchedToDeviceAuth', { method: deviceAuthMethodName }),
        [{ text: t('Global.OK'), onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error setting account security method: ${errMessage}`)
      Alert.alert(t('BCSC.Settings.AppSecurity.ErrorTitle'), t('BCSC.Settings.AppSecurity.SetupFailedMessage'))
    }
  }, [logger, navigation, t, deviceAuthMethodName])

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
      onDeviceAuthSuccess={handleDeviceAuthSuccess}
      onPINPress={handlePINPress}
      onLearnMorePress={handleLearnMorePress}
      currentMethod={currentMethod}
      deviceAuthPrompt={t('BCSC.Settings.AppSecurity.AuthenticateToSwitch')}
    />
  )
}
