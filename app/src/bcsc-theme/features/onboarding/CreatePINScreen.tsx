import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  CheckBoxRow,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, TextInput } from 'react-native'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setPIN } from 'react-native-bcsc-core'

interface CreatePINScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingCreatePIN>
}

export const CreatePINScreen: React.FC<CreatePINScreenProps> = () => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { client, isClientReady } = useBCSCApiClientState()
  const { handleSuccessfulAuth } = useSecureActions()
  const { register } = useRegistrationApi(client, isClientReady)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checkboxError, setCheckboxError] = useState(false)
  const [currentPIN1, setCurrentPIN1] = useState('')
  const [currentPIN2, setCurrentPIN2] = useState('')
  const [errorMessage1, setErrorMessage1] = useState<string | undefined>(undefined)
  const [errorMessage2, setErrorMessage2] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const pin2Ref = useRef<TextInput>(null)

  const validateAndContinue = useCallback(
    async (pin1: string, pin2: string) => {
      try {
        setLoading(true)
        setErrorMessage1(undefined)
        setErrorMessage2(undefined)

        if (pin1.length < 6) {
          setErrorMessage1('PIN must be 6 digits')
          setLoading(false)
          return
        }

        if (pin2.length < 6) {
          setErrorMessage2('PIN must be 6 digits')
          setLoading(false)
          return
        }

        if (pin1 !== pin2) {
          setErrorMessage2('PINs do not match')
          setLoading(false)
          return
        }

        if (!checked) {
          setLoading(false)
          setCheckboxError(true)
          return
        }

        const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
        await register(
          isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
        )
        const { success, walletKey } = await setPIN(pin1)

        if (success) {
          await handleSuccessfulAuth(walletKey)
          logger.info('PIN set successfully and onboarding completed')
        } else {
          setErrorMessage1('Failed to set PIN')
        }
      } catch (error) {
        setErrorMessage1('An error occurred while setting the PIN')
        logger.error(`PIN setup error: ${error}`)
      } finally {
        setLoading(false)
      }
    },
    [checked, logger, handleSuccessfulAuth, register]
  )

  const onPressContinue = useCallback(async () => {
    await validateAndContinue(currentPIN1, currentPIN2)
  }, [currentPIN1, currentPIN2, validateAndContinue])

  const handlePIN1Change = useCallback((pin: string) => {
    setCurrentPIN1(pin)
  }, [])

  const handlePIN1Complete = useCallback(() => {
    setErrorMessage1(undefined)
    pin2Ref.current?.focus()
  }, [])

  const handlePIN2Change = useCallback((pin: string) => {
    setCurrentPIN2(pin)
  }, [])

  const handlePIN2Complete = useCallback(
    (completedPIN: string) => {
      setErrorMessage2(undefined)
      Keyboard.dismiss()
      validateAndContinue(currentPIN1, completedPIN)
    },
    [currentPIN1, validateAndContinue]
  )

  const controls = (
    <>
      {checkboxError ? (
        <ThemedText
          variant={'inlineErrorText'}
          style={{ textAlign: 'right' }}
        >{`You must check this box to continue.`}</ThemedText>
      ) : null}
      <CheckBoxRow
        title={`I understand if I forget my PIN that I have to set up this app again.`}
        accessibilityLabel={`I understand if I forget my PIN that I have to set up this app again.`}
        testID={testIdWithKey('IUnderstand')}
        checked={checked}
        onPress={() => {
          setCheckboxError(checked)
          setChecked(!checked)
        }}
        reverse
        titleStyle={{ textAlign: 'right' }}
      />
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        disabled={loading || currentPIN1.length < 6 || currentPIN2.length < 6 || !checked}
        onPress={onPressContinue}
      >
        {loading && <ButtonLoading />}
      </Button>
    </>
  )

  return (
    <ScreenWrapper padded keyboardActive controls={controls}>
      <ThemedText variant={'bold'}>{`Create a 6-digit PIN`}</ThemedText>
      <PINInput onPINChange={handlePIN1Change} onPINComplete={handlePIN1Complete} errorMessage={errorMessage1} />
      <ThemedText variant={'bold'}>{`Confirm PIN`}</ThemedText>
      <PINInput
        ref={pin2Ref}
        onPINChange={handlePIN2Change}
        onPINComplete={handlePIN2Complete}
        errorMessage={errorMessage2}
      />
      <ThemedText variant={'bold'}>{`Remember your PIN`}</ThemedText>
      <ThemedText>{`We cannot help you get or reset your PIN if you forget it. It's only saved on this device. It's never shared with us.`}</ThemedText>
    </ScreenWrapper>
  )
}
