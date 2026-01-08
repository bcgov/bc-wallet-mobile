import { PINInput } from '@/bcsc-theme/components/PINInput'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
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
import { Keyboard, TextInput, View } from 'react-native'
import { setPIN as setNativePIN, verifyPIN } from 'react-native-bcsc-core'

interface ChangePINFormProps {
  /**
   * Called when PIN is successfully changed.
   */
  onSuccess: () => Promise<void>
  /**
   * Optional loading message to show during PIN change
   */
  loadingMessage?: string
}

/**
 * Change PIN form component that handles:
 * - Current PIN verification
 * - New PIN input fields (create + confirm)
 * - Validation (6 digits, matching)
 * - Setting the new PIN via native module
 *
 * Used when user already has a PIN and wants to change it.
 */
export const ChangePINForm: React.FC<ChangePINFormProps> = ({ onSuccess, loadingMessage }: ChangePINFormProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const { startLoading, stopLoading } = useLoadingScreen()
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checkboxError, setCheckboxError] = useState(false)
  const [currentPIN, setCurrentPIN] = useState('')
  const [newPIN, setNewPIN] = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [currentPINError, setCurrentPINError] = useState<string | undefined>(undefined)
  const [newPINError, setNewPINError] = useState<string | undefined>(undefined)
  const [confirmPINError, setConfirmPINError] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const newPINRef = useRef<TextInput>(null)
  const confirmPINRef = useRef<TextInput>(null)

  const validateAndChangePIN = useCallback(
    async (current: string, newPin: string, confirm: string) => {
      try {
        setLoading(true)
        setCurrentPINError(undefined)
        setNewPINError(undefined)
        setConfirmPINError(undefined)

        // Validate current PIN length
        if (current.length < 6) {
          setCurrentPINError(t('BCSC.ChangePIN.PINTooShort'))
          setLoading(false)
          return
        }

        // Validate new PIN length
        if (newPin.length < 6) {
          setNewPINError(t('BCSC.ChangePIN.PINTooShort'))
          setLoading(false)
          return
        }

        // Validate confirm PIN length
        if (confirm.length < 6) {
          setConfirmPINError(t('BCSC.ChangePIN.PINTooShort'))
          setLoading(false)
          return
        }

        // Check if new PINs match
        if (newPin !== confirm) {
          setConfirmPINError(t('BCSC.ChangePIN.PINsDoNotMatch'))
          setLoading(false)
          return
        }

        // Check if checkbox is checked
        if (!checked) {
          setLoading(false)
          setCheckboxError(true)
          return
        }

        // Show loading indicator
        startLoading(loadingMessage ?? t('BCSC.ChangePIN.ChangingPIN'))

        // Verify current PIN first
        const verifyResult = await verifyPIN(current)
        if (!verifyResult.success) {
          if (verifyResult.locked) {
            setCurrentPINError(verifyResult.message || t('BCSC.ChangePIN.AccountLocked'))
          } else {
            setCurrentPINError(t('BCSC.ChangePIN.IncorrectPIN'))
          }
          setLoading(false)
          stopLoading()
          return
        }

        // Current PIN verified, now set the new PIN
        const { success } = await setNativePIN(newPin)

        if (success) {
          logger.info('PIN changed successfully')
          await onSuccess()
        } else {
          setNewPINError(t('BCSC.ChangePIN.FailedToSetPIN'))
        }
      } catch (error) {
        setCurrentPINError(t('BCSC.ChangePIN.ErrorChangingPIN'))
        logger.error(`PIN change error: ${error}`)
      } finally {
        setLoading(false)
        stopLoading()
      }
    },
    [checked, logger, onSuccess, startLoading, stopLoading, loadingMessage, t]
  )

  const onPressChangePIN = useCallback(async () => {
    await validateAndChangePIN(currentPIN, newPIN, confirmPIN)
  }, [currentPIN, newPIN, confirmPIN, validateAndChangePIN])

  const handleCurrentPINChange = useCallback((pin: string) => {
    setCurrentPIN(pin)
  }, [])

  const handleCurrentPINComplete = useCallback(() => {
    setCurrentPINError(undefined)
    newPINRef.current?.focus()
  }, [])

  const handleNewPINChange = useCallback((pin: string) => {
    setNewPIN(pin)
  }, [])

  const handleNewPINComplete = useCallback(() => {
    setNewPINError(undefined)
    confirmPINRef.current?.focus()
  }, [])

  const handleConfirmPINChange = useCallback((pin: string) => {
    setConfirmPIN(pin)
  }, [])

  const handleConfirmPINComplete = useCallback(
    (completedPIN: string) => {
      setConfirmPINError(undefined)
      Keyboard.dismiss()
      validateAndChangePIN(currentPIN, newPIN, completedPIN)
    },
    [currentPIN, newPIN, validateAndChangePIN]
  )

  const controls = (
    <>
      {checkboxError ? (
        <ThemedText variant={'inlineErrorText'} style={{ textAlign: 'right' }}>
          {t('BCSC.ChangePIN.MustCheckBox')}
        </ThemedText>
      ) : null}
      <CheckBoxRow
        title={t('BCSC.ChangePIN.IUnderstand')}
        accessibilityLabel={t('BCSC.ChangePIN.IUnderstand')}
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
        title={t('BCSC.ChangePIN.ButtonTitle')}
        accessibilityLabel={t('BCSC.ChangePIN.ButtonTitle')}
        testID={testIdWithKey('ChangePIN')}
        disabled={loading || currentPIN.length < 6 || newPIN.length < 6 || confirmPIN.length < 6 || !checked}
        onPress={onPressChangePIN}
      >
        {loading && <ButtonLoading />}
      </Button>
    </>
  )

  return (
    <ScreenWrapper padded keyboardActive controls={controls}>
      <ThemedText variant={'bold'}>{t('BCSC.ChangePIN.EnterCurrentPIN')}</ThemedText>
      <PINInput
        onPINChange={handleCurrentPINChange}
        onPINComplete={handleCurrentPINComplete}
        errorMessage={currentPINError}
      />

      <View style={{ marginTop: 16 }}>
        <ThemedText variant={'bold'}>{t('BCSC.ChangePIN.EnterNewPIN')}</ThemedText>
        <PINInput
          ref={newPINRef}
          onPINChange={handleNewPINChange}
          onPINComplete={handleNewPINComplete}
          errorMessage={newPINError}
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <ThemedText variant={'bold'}>{t('BCSC.ChangePIN.ReenterNewPIN')}</ThemedText>
        <PINInput
          ref={confirmPINRef}
          onPINChange={handleConfirmPINChange}
          onPINComplete={handleConfirmPINComplete}
          errorMessage={confirmPINError}
        />
      </View>

      <View style={{ marginTop: 16 }}>
        <ThemedText variant={'bold'}>{t('BCSC.ChangePIN.RememberPIN')}</ThemedText>
        <ThemedText>{t('BCSC.ChangePIN.RememberPINDescription')}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}
