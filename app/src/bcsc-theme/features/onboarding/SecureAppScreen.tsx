import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { CardButton } from '@/bcsc-theme/components/CardButton'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createSecuringAppWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { SECURE_APP_LEARN_MORE_URL } from '@/constants'
import { Button, ButtonType, ScreenWrapper, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { upperFirst } from 'lodash'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet } from 'react-native'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'

interface SecureAppScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingSecureApp>
}

/**
 * Renders the Secure App screen, which provides options for securing the app using biometric authentication or a PIN.
 *
 * @returns {*} {JSX.Element} The SecureAppScreen component.
 */
export const SecureAppScreen = ({ navigation }: SecureAppScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { client, isClientReady } = useBCSCApiClientState()
  const { handleSuccessfulAuth } = useSecureActions()
  const { register } = useRegistrationApi(client, isClientReady)
  const [isDeviceAuthAvailable, setIsDeviceAuthAvailable] = useState(false)
  const [deviceAuthMethodName, setDeviceAuthMethodName] = useState('')
  const { startLoading, stopLoading } = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    scollContainer: {
      gap: Spacing.lg,
    },
  })

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        startLoading()
        const [deviceAuthAvailable, biometricType] = await Promise.all([
          canPerformDeviceAuthentication(),
          getAvailableBiometricType(),
        ])
        setIsDeviceAuthAvailable(deviceAuthAvailable)
        setDeviceAuthMethodName(biometricType === BiometricType.None ? 'Device Passcode' : upperFirst(biometricType))
      } catch (error) {
        const strErr = error instanceof Error ? error.message : String(error)
        logger.error(`Error checking device auth availability: ${strErr}`)
        setIsDeviceAuthAvailable(false)
      } finally {
        stopLoading()
      }
    }
    asyncEffect()
  }, [logger, startLoading, stopLoading])

  const handleLearnMore = () => {
    navigation.navigate(BCSCScreens.OnboardingWebView, {
      title: t('BCSC.Onboarding.PrivacyPolicyHeaderSecuringApp'),
      injectedJavascript: createSecuringAppWebViewJavascriptInjection(),
      url: SECURE_APP_LEARN_MORE_URL,
    })
  }

  const handleDeviceAuthentication = async () => {
    try {
      startLoading()

      if (isDeviceAuthAvailable) {
        try {
          const deviceAuthSuccessful = await performDeviceAuthentication('Authenticate to secure your app')
          if (deviceAuthSuccessful) {
            await completeDeviceSecuritySetup()
            return
          }
        } catch (deviceAuthError) {
          const strErr = deviceAuthError instanceof Error ? deviceAuthError.message : String(deviceAuthError)
          logger.debug(`Device authentication failed ${strErr}`)
        }
      }
    } catch (error) {
      const strErr = error instanceof Error ? error.message : String(error)
      logger.error(`Error during device authentication: ${strErr}`)
    } finally {
      stopLoading()
    }
  }

  const completeDeviceSecuritySetup = async () => {
    try {
      await register(AccountSecurityMethod.DeviceAuth)

      // Setup device security (generates random PIN and stores it securely)
      const { success, walletKey } = await setupDeviceSecurity()
      if (success) {
        await handleSuccessfulAuth(walletKey)
        logger.info('Device security setup completed successfully')
      } else {
        logger.error('Device security setup failed')
      }
    } catch (error) {
      const strErr = error instanceof Error ? error.message : String(error)
      logger.error(`Error completing device security setup: ${strErr}`)
    }
  }

  const controlsForNoDeviceAuth = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={'Choose a PIN'}
        accessibilityLabel={'Choose a PIN'}
        onPress={() => {
          navigation.navigate(BCSCScreens.OnboardingCreatePIN)
        }}
        testID={'blah'}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={'Learn more'}
        accessibilityLabel={'Learn more'}
        onPress={handleLearnMore}
        testID={'blah'}
      />
    </>
  )

  return isDeviceAuthAvailable ? (
    <ScreenWrapper scrollViewContainerStyle={styles.scollContainer}>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.SecureAppHeader')}</ThemedText>
      <ThemedText>{t('BCSC.Onboarding.SecureAppContent')}</ThemedText>
      <CardButton
        title={t('BCSC.Onboarding.SecureAppDeviceAuthTitle', { deviceAuthMethodName })}
        subtext={t('BCSC.Onboarding.SecureAppDeviceAuthSubtext', {
          platform: Platform.OS === 'ios' ? 'iPhone or iPad' : 'Android device',
        })}
        onPress={handleDeviceAuthentication}
      />

      <CardButton
        title={t('BCSC.Onboarding.SecureAppPINTitle')}
        subtext={t('BCSC.Onboarding.SecureAppPINSubtext')}
        onPress={() => {
          navigation.navigate(BCSCScreens.OnboardingCreatePIN)
        }}
      />

      <CardButton title={t('BCSC.Onboarding.LearnMore')} endIcon="open-in-new" onPress={handleLearnMore} />
    </ScreenWrapper>
  ) : (
    <ScreenWrapper padded scrollViewContainerStyle={styles.scollContainer} controls={controlsForNoDeviceAuth}>
      <ThemedText variant="headingThree">{`Secure this app`}</ThemedText>
      <ThemedText>{`You need to choose a PIN. It keeps your information private.`}</ThemedText>
      <ThemedText>{`It prevents others from using this app to access services as you. For example, if your phone is lost or stolen.`}</ThemedText>
    </ScreenWrapper>
  )
}
