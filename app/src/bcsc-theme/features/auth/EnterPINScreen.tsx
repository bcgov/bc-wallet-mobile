import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCSecureActions } from '@/bcsc-theme/hooks/useBCSCSecureActions'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  DispatchAction,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccount,
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
  const [, dispatch] = useStore<BCState>()
  const [loading, setLoading] = useState(false)
  const [currentPIN, setCurrentPIN] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { updateWalletKey } = useBCSCSecureActions()

  useEffect(() => {
    const initializeAuthentication = async () => {
      try {
        startLoading()

        // Get account and security method
        const account = await getAccount()
        if (!account?.id) {
          setErrorMessage('Account not found')
          stopLoading()
          return
        }

        const accountSecurityMethod = await getAccountSecurityMethod(account.id)

        // Handle device authentication methods
        if (accountSecurityMethod === AccountSecurityMethod.DeviceAuth) {
          const deviceAuthAvailable = await canPerformDeviceAuthentication()

          if (deviceAuthAvailable) {
            // Attempt device authentication
            try {
              const result = await unlockWithDeviceSecurity(account.id, 'Unlock your app')
              if (result.success && result.walletKey) {
                // Store wallet key and mark as verified
                updateWalletKey(result.walletKey)
                dispatch({ type: DispatchAction.DID_AUTHENTICATE })
                logger.info('Device authentication successful')
                return
              } else {
                // Device auth failed, go back
                logger.info('Device authentication failed')
                navigation.goBack()
                return
              }
            } catch (error) {
              const strErr = error instanceof Error ? error.message : String(error)
              logger.error(`Device authentication error: ${strErr}`)
              navigation.goBack()
              return
            }
          } else {
            navigation.navigate(BCSCScreens.DeviceAuthAppReset)
            return
          }
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
  }, [startLoading, stopLoading, updateWalletKey, logger, navigation, dispatch])

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

        const account = await getAccount()
        if (!account?.id) {
          setErrorMessage('No account found')
          setLoading(false)
          return
        }

        const result = await verifyPIN(account.id, pin)

        if (result.success && result.walletKey) {
          // Store wallet key and mark as verified
          updateWalletKey(result.walletKey)

          logger.info('PIN verified successfully - navigating to main app')
          // Auth stack should automatically dismiss when verified becomes true
        } else {
          if (result.locked) {
            // TODO: Navigate to lockout screen
            setErrorMessage(`Account locked. Try again in ${Math.ceil(result.remainingTime / 1000)} seconds.`)
          } else {
            setErrorMessage(result.message || 'Incorrect PIN')
          }
        }
      } catch (error) {
        setErrorMessage('An error occurred while verifying the PIN.')
        logger.error(`PIN verification error: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [logger, updateWalletKey]
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
    [verifyPINAndContinue]
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
