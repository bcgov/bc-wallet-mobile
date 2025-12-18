import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  unlockWithDeviceSecurity,
  verifyPIN,
} from 'react-native-bcsc-core'

interface EnterPINScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.EnterPIN>
}

export const EnterPINScreen = ({ navigation }: EnterPINScreenProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { startLoading, stopLoading } = useLoadingScreen()
  const [loading, setLoading] = useState(false)
  const [currentPIN, setCurrentPIN] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { handleSuccessfulAuth } = useSecureActions()

  useEffect(() => {
    const initializeAuthentication = async () => {
      try {
        startLoading()

        const accountSecurityMethod = await getAccountSecurityMethod()

        // Only attempt device authentication if that is the configured method
        if (accountSecurityMethod !== AccountSecurityMethod.DeviceAuth) {
          return
        }

        // Check if they have changed their device auth settings
        const deviceAuthAvailable = await canPerformDeviceAuthentication()

        if (deviceAuthAvailable) {
          try {
            const { success, walletKey } = await unlockWithDeviceSecurity('Unlock your app')
            if (success) {
              await handleSuccessfulAuth(walletKey)
              logger.info('Device authentication successful')
            } else {
              logger.info('Device authentication failed')
              navigation.goBack()
            }
          } catch (error) {
            const strErr = error instanceof Error ? error.message : String(error)
            logger.error(`Device authentication error: ${strErr}`)
            navigation.goBack()
          }
        } else {
          navigation.navigate(BCSCScreens.DeviceAuthAppReset)
        }
      } catch (error) {
        const strErr = error instanceof Error ? error.message : String(error)
        logger.error(`Authentication initialization error: ${strErr}`)
        setErrorMessage('Unable to initialize authentication')
      } finally {
        stopLoading()
      }
    }

    initializeAuthentication()
  }, [startLoading, stopLoading, logger, navigation, handleSuccessfulAuth])

  const verifyPINAndContinue = useCallback(
    async (pin: string) => {
      try {
        setLoading(true)
        setErrorMessage(undefined)

        if (pin.length < 6) {
          setErrorMessage('PIN must be 6 digits')
          setLoading(false)
          return
        }

        const { success, walletKey, locked, message } = await verifyPIN(pin)

        if (success) {
          await handleSuccessfulAuth(walletKey)
          logger.info('PIN verified successfully - navigating to main app')
        } else if (locked) {
          navigation.navigate(BCSCScreens.Lockout)
        } else {
          setErrorMessage(message || 'Incorrect PIN')
        }
      } catch (error) {
        setErrorMessage('An error occurred while verifying the PIN.')
        logger.error(`PIN verification error: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [logger, handleSuccessfulAuth, navigation],
  )

  const onPressContinue = useCallback(async () => {
    await verifyPINAndContinue(currentPIN)
  }, [currentPIN, verifyPINAndContinue])

  const onPressGetHelp = useCallback(() => {
    // TODO: implement Get Help action
  }, [])

  const handlePINChange = useCallback((pin: string) => {
    setCurrentPIN(pin)
  }, [])

  const handlePINComplete = useCallback(
    (completedPIN: string) => {
      if (completedPIN.length === 6) {
        verifyPINAndContinue(completedPIN)
      }
    },
    [verifyPINAndContinue],
  )

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        disabled={loading || currentPIN.length < 6}
        onPress={onPressContinue}
      >
        {loading && <ButtonLoading />}
      </Button>
      <Button
        buttonType={ButtonType.Secondary}
        title={'Get Help'}
        accessibilityLabel={'Get Help'}
        testID={testIdWithKey('GetHelp')}
        onPress={onPressGetHelp}
      />
    </>
  )

  return (
    <ScreenWrapper padded keyboardActive controls={controls}>
      <ThemedText variant={'bold'}>{`Enter your 6-digit PIN`}</ThemedText>
      <ThemedText variant={'caption'}>{`The one you chose to secure this app`}</ThemedText>
      <PINInput onPINChange={handlePINChange} onPINComplete={handlePINComplete} errorMessage={errorMessage} />
    </ScreenWrapper>
  )
}
