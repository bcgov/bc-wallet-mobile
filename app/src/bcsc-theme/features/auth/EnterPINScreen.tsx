import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { PIN_LENGTH } from '@/constants'
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
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InteractionManager } from 'react-native'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  isAccountLocked,
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
          // If PIN is the method, check if account is locked and immediately show
          // lockout screen if so
          const { locked } = await isAccountLocked()
          if (locked) {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: BCSCScreens.Lockout }],
              })
            )
          }
          return
        }

        // Check if they have changed their device auth settings
        const deviceAuthAvailable = await canPerformDeviceAuthentication()

        if (deviceAuthAvailable) {
          const { success, walletKey } = await unlockWithDeviceSecurity('Unlock your app')
          if (success) {
            await handleSuccessfulAuth(walletKey)
            logger.info('Device authentication successful')
          } else {
            logger.info('Device authentication failed - user cancelled or auth failed')
            navigation.goBack()
          }
        } else {
          navigation.navigate(BCSCScreens.DeviceAuthAppReset)
        }
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Device authentication error: ${errMessage}`)
        navigation.goBack()
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

        // Wait for UI to update before running native methods that block the JS thread
        // This ensures loading indicators are visible
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve())
        })

        if (pin.length < PIN_LENGTH) {
          setErrorMessage('PIN must be 6 digits')
          setLoading(false)
          return
        }

        const { success, walletKey, locked, message } = await verifyPIN(pin)

        if (success) {
          await handleSuccessfulAuth(walletKey)
          logger.info('PIN verified successfully - navigating to main app')
        } else if (locked) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.Lockout }],
            })
          )
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
    [logger, handleSuccessfulAuth, navigation]
  )

  const onPressContinue = useCallback(async () => {
    await verifyPINAndContinue(currentPIN)
  }, [currentPIN, verifyPINAndContinue])

  const onPressGetHelp = useCallback(() => {
    // TODO: implement Get Help action
  }, [])

  const handlePINChange = useCallback((pin: string) => {
    setErrorMessage(undefined)
    setCurrentPIN(pin)
  }, [])

  const handlePINComplete = useCallback(
    async (completedPIN: string) => {
      if (completedPIN.length === PIN_LENGTH) {
        await verifyPINAndContinue(completedPIN)
      }
    },
    [verifyPINAndContinue]
  )

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        disabled={loading}
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
    <ScreenWrapper keyboardActive controls={controls}>
      <ThemedText variant={'bold'}>{`Enter your 6-digit PIN`}</ThemedText>
      <ThemedText variant={'caption'}>{`The one you chose to secure this app`}</ThemedText>
      <PINInput onPINChange={handlePINChange} onPINComplete={handlePINComplete} errorMessage={errorMessage} />
    </ScreenWrapper>
  )
}
