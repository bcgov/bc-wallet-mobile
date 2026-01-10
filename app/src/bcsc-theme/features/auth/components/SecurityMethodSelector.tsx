import { CardButton } from '@/bcsc-theme/components/CardButton'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { Button, ButtonType, ScreenWrapper, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { upperFirst } from 'lodash'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, View } from 'react-native'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
} from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialIcons'

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
   * Called when user presses Learn More.
   * The parent should navigate to the appropriate WebView.
   */
  onLearnMorePress: () => void
  /**
   * Current security method (for settings context).
   * If provided, shows current method indicator and disables the current option.
   * If undefined, assumes onboarding context (no current method).
   */
  currentMethod?: AccountSecurityMethod | null
  /**
   * Optional custom prompt for device authentication.
   */
  deviceAuthPrompt?: string
}

/**
 * Shared security method selector component.
 * Displays options to secure the app using device authentication (biometrics/passcode) or PIN.
 * Used by both SecureAppScreen (onboarding) and ChangeSecurityScreen (settings).
 */
export const SecurityMethodSelector: React.FC<SecurityMethodSelectorProps> = ({
  onDeviceAuthPress,
  onPINPress,
  onLearnMorePress,
  currentMethod,
  deviceAuthPrompt,
}: SecurityMethodSelectorProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { startLoading, stopLoading } = useLoadingScreen()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [isDeviceAuthAvailable, setIsDeviceAuthAvailable] = useState(false)
  const [deviceAuthMethodName, setDeviceAuthMethodName] = useState('')

  const isSettingsContext = currentMethod !== undefined
  const isCurrentMethodDeviceAuth = currentMethod === AccountSecurityMethod.DeviceAuth

  const styles = StyleSheet.create({
    scrollContainer: {
      gap: Spacing.lg,
    },
    currentMethodContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
      borderRadius: Spacing.sm,
      gap: Spacing.sm,
    },
    currentMethodText: {
      flex: 1,
    },
  })

  useEffect(() => {
    const loadDeviceAuthInfo = async () => {
      try {
        startLoading()
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
        stopLoading()
      }
    }

    loadDeviceAuthInfo()
  }, [logger, startLoading, stopLoading])

  const handleDeviceAuthentication = async () => {
    try {
      startLoading()

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

  // Pre-compute conditional values
  const platformName = Platform.OS === 'ios' ? 'iPhone or iPad' : 'Android device'
  const currentMethodIcon = isCurrentMethodDeviceAuth ? 'fingerprint' : 'lock'
  const currentMethodLabel = isCurrentMethodDeviceAuth
    ? deviceAuthMethodName || t('BCSC.Settings.AppSecurity.DeviceAuth')
    : t('BCSC.Settings.AppSecurity.PIN')
  const deviceAuthSubtext =
    isSettingsContext && isCurrentMethodDeviceAuth
      ? t('BCSC.Settings.AppSecurity.CurrentlySelected')
      : t('BCSC.Onboarding.SecureAppDeviceAuthSubtext', { platform: platformName })
  const pinSubtext =
    isSettingsContext && !isCurrentMethodDeviceAuth
      ? t('BCSC.Settings.AppSecurity.CurrentlySelected')
      : t('BCSC.Onboarding.SecureAppPINSubtext')

  // Current method indicator (only shown in settings context)
  const currentMethodIndicator = isSettingsContext ? (
    <View style={styles.currentMethodContainer}>
      <Icon name={currentMethodIcon} size={24} color={ColorPalette.brand.primary} />
      <View style={styles.currentMethodText}>
        <ThemedText variant="labelSubtitle">{t('BCSC.Settings.AppSecurity.CurrentMethod')}</ThemedText>
        <ThemedText variant="bold">{currentMethodLabel}</ThemedText>
      </View>
      <Icon name="check-circle" size={24} color={ColorPalette.semantic.success} />
    </View>
  ) : null

  // Controls for when device auth is NOT available
  const controlsForNoDeviceAuth = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.Onboarding.SecureAppPINTitle')}
        accessibilityLabel={t('BCSC.Onboarding.SecureAppPINTitle')}
        onPress={onPINPress}
        testID={'ChoosePINButton'}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.Onboarding.LearnMore')}
        accessibilityLabel={t('BCSC.Onboarding.LearnMore')}
        onPress={onLearnMorePress}
        testID={'LearnMoreButton'}
      />
    </>
  )

  // When device auth is available, show both options
  if (isDeviceAuthAvailable) {
    return (
      <ScreenWrapper scrollViewContainerStyle={styles.scrollContainer}>
        <ThemedText variant="headingThree">{t('BCSC.Onboarding.SecureAppHeader')}</ThemedText>
        <ThemedText>{t('BCSC.Onboarding.SecureAppContent')}</ThemedText>

        {/* Show current method indicator (settings only) */}
        {currentMethodIndicator}

        {/* Device Auth Option */}
        <CardButton
          title={t('BCSC.Onboarding.SecureAppDeviceAuthTitle', { deviceAuthMethodName })}
          subtext={deviceAuthSubtext}
          onPress={handleDeviceAuthentication}
          disabled={isSettingsContext && isCurrentMethodDeviceAuth}
        />

        {/* PIN Option */}
        <CardButton
          title={t('BCSC.Onboarding.SecureAppPINTitle')}
          subtext={pinSubtext}
          onPress={onPINPress}
          disabled={isSettingsContext && !isCurrentMethodDeviceAuth}
        />

        {/* Learn More */}
        <CardButton title={t('BCSC.Onboarding.LearnMore')} endIcon="open-in-new" onPress={onLearnMorePress} />
      </ScreenWrapper>
    )
  }

  // When device auth is NOT available
  return (
    <ScreenWrapper padded scrollViewContainerStyle={styles.scrollContainer} controls={controlsForNoDeviceAuth}>
      <ThemedText variant="headingThree">{t('BCSC.Onboarding.SecureAppHeader')}</ThemedText>

      {/* Show current method indicator (settings only) */}
      {currentMethodIndicator}

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
