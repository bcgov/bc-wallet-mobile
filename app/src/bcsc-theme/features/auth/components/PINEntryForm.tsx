import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
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
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, TextInput } from 'react-native'
import {
  AccountSecurityMethod,
  BcscNativeErrorCodes,
  canPerformDeviceAuthentication,
  isBcscNativeError,
  setPIN as setNativePIN,
} from 'react-native-bcsc-core'

export interface PINEntryResult {
  success: boolean
  walletKey: string
}

interface PINEntryFormProps {
  /**
   * Called when PIN is successfully set. Receives the wallet key.
   * The component handles PIN validation and setting internally.
   */
  onSuccess: (result: PINEntryResult) => Promise<void>
  /**
   * Optional loading message to show during PIN setup
   */
  loadingMessage?: string
  /**
   * Translation key prefix for labels (defaults to 'BCSC.PIN')
   * Will look for: CreatePIN, ConfirmPIN, RememberPIN, RememberPINDescription,
   * IUnderstand, MustCheckBox, PINTooShort, PINsDoNotMatch, FailedToSetPIN, ErrorSettingPIN
   */
  translationPrefix?: string
}

/**
 * Shared PIN entry form component that handles:
 * - Two PIN input fields (create + confirm)
 * - Validation (6 digits, matching)
 * - Checkbox acknowledgment
 * - Setting the PIN via native module
 *
 * Used by both onboarding CreatePINScreen and settings ChangePINScreen.
 */
export const PINEntryForm: React.FC<PINEntryFormProps> = ({
  onSuccess,
  loadingMessage,
  translationPrefix = 'BCSC.PIN',
}: PINEntryFormProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { startLoading, stopLoading } = useLoadingScreen()
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checkboxError, setCheckboxError] = useState(false)
  const [currentPIN1, setCurrentPIN1] = useState('')
  const [currentPIN2, setCurrentPIN2] = useState('')
  const [errorMessage1, setErrorMessage1] = useState<string | undefined>(undefined)
  const [errorMessage2, setErrorMessage2] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { client, isClientReady } = useBCSCApiClientState()
  const { register } = useRegistrationApi(client, isClientReady)
  const { emitErrorAlert } = useErrorAlert()

  const pin2Ref = useRef<TextInput>(null)

  // Helper to get translation with prefix
  const tWithPrefix = useCallback((key: string) => t(`${translationPrefix}.${key}`), [t, translationPrefix])

  const validateAndContinue = useCallback(
    async (pin1: string, pin2: string) => {
      try {
        setLoading(true)
        setErrorMessage1(undefined)
        setErrorMessage2(undefined)

        if (pin1.length < 6) {
          setErrorMessage1(tWithPrefix('PINTooShort'))
          setLoading(false)
          return
        }

        if (pin2.length < 6) {
          setErrorMessage2(tWithPrefix('PINTooShort'))
          setLoading(false)
          return
        }

        if (pin1 !== pin2) {
          setErrorMessage2(tWithPrefix('PINsDoNotMatch'))
          setLoading(false)
          return
        }

        if (!checked) {
          setLoading(false)
          setCheckboxError(true)
          return
        }

        // All validations passed, show a full screen loading indicator
        startLoading(loadingMessage ?? tWithPrefix('SettingUpPIN'))

        // Register with the appropriate security method
        const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
        await register(
          isDeviceAuthAvailable ? AccountSecurityMethod.PinWithDeviceAuth : AccountSecurityMethod.PinNoDeviceAuth
        )

        // Set the PIN using native module
        const { success, walletKey } = await setNativePIN(pin1)

        if (success) {
          // Call the success handler with the wallet key
          await onSuccess({ success, walletKey })
          logger.info('PIN set successfully')
        } else {
          setErrorMessage1(tWithPrefix('FailedToSetPIN'))
        }
      } catch (error) {
        if (isBcscNativeError(error) && error.code === BcscNativeErrorCodes.KEYPAIR_GENERATION_FAILED) {
          emitErrorAlert(AppError.fromErrorDefinition(ErrorRegistry.KEYPAIR_GENERATION_ERROR, { cause: error }))
        }
        setErrorMessage1(tWithPrefix('ErrorSettingPIN'))
        logger.error(`PIN setup error: ${error}`)
      } finally {
        setLoading(false)
        stopLoading()
      }
    },
    [checked, logger, onSuccess, startLoading, stopLoading, loadingMessage, tWithPrefix, register, emitErrorAlert]
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
        <ThemedText variant={'inlineErrorText'} style={{ textAlign: 'right' }}>
          {tWithPrefix('MustCheckBox')}
        </ThemedText>
      ) : null}
      <CheckBoxRow
        title={tWithPrefix('IUnderstand')}
        accessibilityLabel={tWithPrefix('IUnderstand')}
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
      <ThemedText variant={'bold'}>{tWithPrefix('CreatePIN')}</ThemedText>
      <PINInput onPINChange={handlePIN1Change} onPINComplete={handlePIN1Complete} errorMessage={errorMessage1} />
      <ThemedText variant={'bold'}>{tWithPrefix('ConfirmPIN')}</ThemedText>
      <PINInput
        ref={pin2Ref}
        onPINChange={handlePIN2Change}
        onPINComplete={handlePIN2Complete}
        errorMessage={errorMessage2}
      />
      <ThemedText variant={'bold'}>{tWithPrefix('RememberPIN')}</ThemedText>
      <ThemedText>{tWithPrefix('RememberPINDescription')}</ThemedText>
    </ScreenWrapper>
  )
}
