import { CardButton } from '@/bcsc-theme/components/CardButton'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { TFunction } from 'i18next'
import { upperFirst } from 'lodash'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Platform, StyleSheet } from 'react-native'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
} from 'react-native-bcsc-core'

interface SecurityMethodSelectorProps {
  /**
   * Called when user successfully authenticates with device auth (biometric/passcode).
   * The parent is responsible for calling register() FIRST, then setupDeviceSecurity().
   * This is because setupDeviceSecurity() requires an account to already exist.
   */
  onDeviceAuthPress: () => Promise<void>
  /**
   * Called when user selects PIN option.
   * The parent should navigate to the appropriate PIN screen.
   */
  onPINPress: () => void
  /**
   * Current security method (for settings context).
   * If provided, the matching option's card is shown as selected (the current method).
   * If undefined, assumes onboarding context (no current method).
   */
  currentMethod?: AccountSecurityMethod | null
  /**
   * Optional custom prompt for device authentication.
   */
  deviceAuthPrompt?: string
}

interface SecurityCopy {
  header: string
  content: string
  deviceAuthTitle: string
  deviceAuthSubtext: string
  pinTitle: string
  pinSubtext: string
}

/**
 * Builds the localized copy for the selector based on context (onboarding vs settings).
 * Extracted to module scope to keep the component's cognitive complexity low.
 */
const getSecurityCopy = (
  t: TFunction,
  {
    isSettingsContext,
    isCurrentMethodDeviceAuth,
    isCurrentMethodPin,
    deviceAuthMethodName,
  }: {
    isSettingsContext: boolean
    isCurrentMethodDeviceAuth: boolean
    isCurrentMethodPin: boolean
    deviceAuthMethodName: string
  }
): SecurityCopy => {
  if (!isSettingsContext) {
    return {
      header: t('BCSC.Onboarding.SecureAppOnboardingHeader'),
      content: t('BCSC.Onboarding.SecureAppOnboardingContent'),
      deviceAuthTitle: t('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle'),
      deviceAuthSubtext: t('BCSC.Onboarding.SecureAppOnboardingDeviceAuthSubtext'),
      pinTitle: t('BCSC.Onboarding.SecureAppPINTitle'),
      pinSubtext: t('BCSC.Onboarding.SecureAppPINSubtext'),
    }
  }

  // Settings uses the same intro copy as onboarding, but each option's card doubles as the current
  // method indicator: whichever method is active shows the CurrentMethod label with the method name
  // as its subtext, while the other keeps its actionable copy.
  const platformName = Platform.OS === 'ios' ? 'iPhone or iPad' : 'Android device'
  const currentMethodLabel = t('BCSC.Settings.AppSecurity.CurrentMethod')
  const deviceAuthName = deviceAuthMethodName || t('BCSC.Settings.AppSecurity.DeviceAuth')
  return {
    header: t('BCSC.Onboarding.SecureAppOnboardingHeader'),
    content: t('BCSC.Onboarding.SecureAppOnboardingContent'),
    deviceAuthTitle: isCurrentMethodDeviceAuth
      ? currentMethodLabel
      : t('BCSC.Onboarding.SecureAppDeviceAuthTitle', { deviceAuthMethodName }),
    deviceAuthSubtext: isCurrentMethodDeviceAuth
      ? deviceAuthName
      : t('BCSC.Onboarding.SecureAppDeviceAuthSubtext', { platform: platformName }),
    pinTitle: isCurrentMethodPin ? currentMethodLabel : t('BCSC.Onboarding.SecureAppPINTitle'),
    pinSubtext: isCurrentMethodPin ? t('BCSC.Settings.AppSecurity.PIN') : t('BCSC.Onboarding.SecureAppPINSubtext'),
  }
}

/**
 * Shared security method selector component.
 * Displays options to secure the app using device authentication (biometrics/passcode) or PIN.
 * Used by both SecureAppScreen (onboarding) and ChangeSecurityScreen (settings).
 */
export const SecurityMethodSelector: React.FC<SecurityMethodSelectorProps> = ({
  onDeviceAuthPress,
  onPINPress,
  currentMethod,
  deviceAuthPrompt,
}: SecurityMethodSelectorProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { startLoading } = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [isLoading, setIsLoading] = useState(true)
  const [isDeviceAuthAvailable, setIsDeviceAuthAvailable] = useState(false)
  const [deviceAuthMethodName, setDeviceAuthMethodName] = useState('')

  const isSettingsContext = currentMethod !== undefined
  const isCurrentMethodDeviceAuth = currentMethod === AccountSecurityMethod.DeviceAuth
  const isCurrentMethodPin =
    currentMethod === AccountSecurityMethod.PinNoDeviceAuth || currentMethod === AccountSecurityMethod.PinWithDeviceAuth

  const styles = StyleSheet.create({
    scrollContainer: {
      gap: Spacing.lg,
      padding: Spacing.lg,
    },
  })

  useEffect(() => {
    const loadDeviceAuthInfo = async () => {
      try {
        const [deviceAuthAvailable, biometricType] = await Promise.all([
          canPerformDeviceAuthentication(),
          getAvailableBiometricType(),
        ])
        setIsDeviceAuthAvailable(deviceAuthAvailable)
        setDeviceAuthMethodName(biometricType === BiometricType.None ? 'Device Passcode' : upperFirst(biometricType))
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Error checking device auth availability: ${errMessage}`)
        setIsDeviceAuthAvailable(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadDeviceAuthInfo()
  }, [logger])

  const handleDeviceAuthentication = async () => {
    const stopLoading = startLoading()
    try {
      if (isDeviceAuthAvailable) {
        try {
          const prompt = deviceAuthPrompt ?? t('BCSC.Security.AuthenticatePrompt')
          const deviceAuthSuccessful = await performDeviceAuthentication(prompt)
          if (deviceAuthSuccessful) {
            // Call the parent handler which is responsible for:
            // 1. Creating the account (register) - MUST happen first
            // 2. Calling setupDeviceSecurity() - requires account to exist
            // 3. Completing auth with the wallet key
            await onDeviceAuthPress()
            return
          }
        } catch (deviceAuthError) {
          const errMessage = deviceAuthError instanceof Error ? deviceAuthError.message : String(deviceAuthError)
          logger.debug(`Device authentication failed: ${errMessage}`)
        }
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error during device authentication: ${errMessage}`)
    } finally {
      stopLoading()
    }
  }

  const copy = getSecurityCopy(t, {
    isSettingsContext,
    isCurrentMethodDeviceAuth,
    isCurrentMethodPin,
    deviceAuthMethodName,
  })

  // In settings, the active method's card is shown as selected (highlighted + check) rather than a
  // separate indicator row. In onboarding there is no current method, so neither card is selected.
  const deviceAuthSelected = isSettingsContext && isCurrentMethodDeviceAuth
  const pinSelected = isSettingsContext && isCurrentMethodPin

  // Controls for when device auth is NOT available
  const controlsForNoDeviceAuth = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.Onboarding.SecureAppPINTitle')}
        accessibilityLabel={t('BCSC.Onboarding.SecureAppPINTitle')}
        onPress={onPINPress}
        testID={testIdWithKey('ChoosePINButton')}
      />
    </ControlContainer>
  )

  if (isLoading) {
    return (
      <ScreenWrapper scrollViewContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
      </ScreenWrapper>
    )
  }

  // When device auth is available, show both options
  if (isDeviceAuthAvailable) {
    return (
      <ScreenWrapper padded={false} scrollViewContainerStyle={styles.scrollContainer}>
        <ThemedText variant="headingThree" style={{ textAlign: isSettingsContext ? 'left' : 'center' }}>
          {copy.header}
        </ThemedText>
        <ThemedText>{copy.content}</ThemedText>

        {/* Device Auth Option (selected when it is the current method in settings) */}
        <CardButton
          title={copy.deviceAuthTitle}
          testID={testIdWithKey('ChooseDeviceAuthButton')}
          subtext={copy.deviceAuthSubtext}
          startIcon="fingerprint"
          onPress={handleDeviceAuthentication}
          selected={deviceAuthSelected}
        />

        {/* PIN Option (selected when it is the current method in settings) */}
        <CardButton
          title={copy.pinTitle}
          testID={testIdWithKey('ChoosePINButton')}
          subtext={copy.pinSubtext}
          startIcon="password"
          onPress={onPINPress}
          selected={pinSelected}
        />
      </ScreenWrapper>
    )
  }

  // When device auth is NOT available
  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={styles.scrollContainer} controls={controlsForNoDeviceAuth}>
      <ThemedText variant="headingThree" style={{ textAlign: isSettingsContext ? 'left' : 'center' }}>
        {copy.header}
      </ThemedText>

      {isSettingsContext ? (
        <ThemedText>{t('BCSC.Settings.AppSecurity.DeviceAuthNotSetup')}</ThemedText>
      ) : (
        <>
          <ThemedText>{t('BCSC.Onboarding.SecureAppNoDeviceAuthContent1')}</ThemedText>
          <ThemedText>{t('BCSC.Onboarding.SecureAppNoDeviceAuthContent2')}</ThemedText>
        </>
      )}
    </ScreenWrapper>
  )
}
