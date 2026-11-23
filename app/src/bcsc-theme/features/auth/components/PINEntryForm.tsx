import { Callout } from '@/bcsc-theme/components/Callout'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PINInput } from '@/bcsc-theme/components/PINInput'
import { clearPinAttempts } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { getBCSCState, requirePINAccount } from '@/bcsc-theme/storage/hooks'
import { newProfile, type Profile } from '@/bcsc-theme/storage/slices/account'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { TEMPORARY_ACCOUNT_CLIENT_ID } from '@/constants'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { TestIds } from '@/test-ids/registry'
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
  useTheme,
} from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, TextInput, View } from 'react-native'
import { AccountSecurityMethod, canPerformDeviceAuthentication, setPIN as setNativePIN } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export interface PINEntryResult {
  success: boolean
  walletKey: string
  // The new account's profile, when this PIN came with one; handleSuccessfulAuth saves it
  profile?: Profile
}

interface PINEntryFormProps {
  /**
   * Called when PIN is successfully set. Receives the wallet key.
   * The component handles PIN validation and setting internally.
   */
  onSuccess: (result: PINEntryResult) => Promise<void>
  /**
   * Keeps the button spinning once `onSuccess` resolves, for an `onSuccess` that always takes this screen
   * away: Create PIN's ends in the root phase swap, which slides this screen out, and a reset would flip the
   * button back in the slide's first frame. Leave it unset when `onSuccess` can stay on the screen (Change
   * PIN navigates only while the screen is focused). Either way the wait stays on the button with the
   * inputs locked, never under the global overlay, so the slide away starts from this screen.
   */
  keepLoadingOnSuccess?: boolean
  /**
   * Translation key prefix for labels (defaults to 'BCSC.PIN')
   * Will look for: CreatePIN, ConfirmPIN, RememberPIN, RememberPINDescription,
   * IUnderstand, MustCheckBox, PINTooShort, PINsDoNotMatch, FailedToSetPIN, ErrorSettingPIN
   */
  translationPrefix?: string
  /**
   * Optional prop to indicate if this form is being used for creating new PIN.
   * Can be used to adjust labels, validation, or behavior as needed.
   * Default is false.
   */
  creatingNewPIN?: boolean
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
  keepLoadingOnSuccess = false,
  translationPrefix = 'BCSC.PIN',
  creatingNewPIN = false,
}: PINEntryFormProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checkboxError, setCheckboxError] = useState(false)
  const [currentPIN1, setCurrentPIN1] = useState('')
  const [currentPIN2, setCurrentPIN2] = useState('')
  const [errorMessage1, setErrorMessage1] = useState<string | undefined>(undefined)
  const [errorMessage2, setErrorMessage2] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const client = useBCSCApiClient()
  const pin2Ref = useRef<TextInput>(null)

  const { Spacing, TextTheme } = useTheme()

  // Helper to get translation with prefix
  const tWithPrefix = useCallback((key: string) => t(`${translationPrefix}.${key}`), [t, translationPrefix])

  const validateAndContinue = useCallback(
    async (pin1: string, pin2: string) => {
      let succeeded = false
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

        let created: Profile | undefined
        if (!getBCSCState().account.profile) {
          // Register with the appropriate security method
          const isDeviceAuthAvailable = await canPerformDeviceAuthentication()
          const deviceSecurityMethod = isDeviceAuthAvailable
            ? AccountSecurityMethod.PinWithDeviceAuth
            : AccountSecurityMethod.PinNoDeviceAuth

          // The PIN is found through the account, so the account comes first
          created = newProfile({
            clientId: TEMPORARY_ACCOUNT_CLIENT_ID,
            issuer: client.endpoints.issuer,
            securityMethod: deviceSecurityMethod,
          })
        }
        const pinAccount = created ? { accountId: created.accountId, issuer: created.issuer } : requirePINAccount()

        // Set the PIN using native module
        const { success, walletKey } = await setNativePIN(pinAccount, pin1)

        if (success) {
          // Wrong attempts at the PIN this one replaces say nothing about the new one
          await clearPinAttempts(logger)

          // Call the success handler with the wallet key
          await onSuccess({ success, walletKey, profile: created })
          succeeded = true
          logger.info('PIN set successfully')
        } else {
          setErrorMessage1(tWithPrefix('FailedToSetPIN'))
        }
      } catch (error) {
        const appError = toAppError(error, ErrorRegistry.PIN_STORE_ERROR)
        setErrorMessage1(tWithPrefix('ErrorSettingPIN'))
        logger.error(`PIN setup error [${appError.appEvent}]: ${appError.technicalMessage ?? appError.message}`)
      } finally {
        if (!succeeded || !keepLoadingOnSuccess) {
          setLoading(false)
        }
      }
    },
    [checked, keepLoadingOnSuccess, tWithPrefix, client.endpoints.issuer, onSuccess, logger]
  )

  const onPressContinue = useCallback(async () => {
    if (loading) {
      return
    }

    await validateAndContinue(currentPIN1, currentPIN2)
  }, [currentPIN1, currentPIN2, loading, validateAndContinue])

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

  const handlePIN2Complete = useCallback(() => {
    setErrorMessage2(undefined)
    Keyboard.dismiss()
  }, [])

  const styles = StyleSheet.create({
    pinEntryContent: {
      gap: Spacing.lg,
    },
    pinFormRow: {
      gap: Spacing.sm,
    },
    pinCheckboxRow: {
      marginHorizontal: -Spacing.sm,
    },
    pinCheckboxError: {
      marginLeft: Spacing.md,
      marginBottom: Spacing.sm,
    },
    pinCheckboxTitle: {
      marginLeft: Spacing.md,
    },
    pinReminder: {
      gap: Spacing.sm,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={creatingNewPIN ? tWithPrefix('CreatePINShort') : t('Global.Continue')}
        accessibilityLabel={a11yLabel(creatingNewPIN ? tWithPrefix('CreatePINShort') : t('Global.Continue'))}
        testID={testIdWithKey(
          creatingNewPIN ? TestIds.onboarding.createPin.createPin : TestIds.onboarding.createPin.continue
        )}
        disabled={loading}
        onPress={onPressContinue}
      >
        {loading && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} keyboardActive controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <View style={styles.pinEntryContent}>
        <View style={styles.pinFormRow}>
          <ThemedText variant={'bold'} style={{ color: TextTheme.headingFour.color }}>
            {tWithPrefix('CreatePIN')}
          </ThemedText>
          <PINInput
            editable={!loading}
            onPINChange={handlePIN1Change}
            onPINComplete={handlePIN1Complete}
            errorMessage={errorMessage1}
            testIDKey={TestIds.onboarding.createPin.pin}
            accessibilityLabel={a11yLabel(tWithPrefix('CreatePINShort'))}
          />
          <ThemedText variant={'labelSubtitle'}>{tWithPrefix('CreatePINExample')}</ThemedText>
        </View>
        <View style={styles.pinFormRow}>
          <ThemedText variant={'bold'} style={{ color: TextTheme.headingFour.color }}>
            {tWithPrefix('ConfirmPIN')}
          </ThemedText>
          <PINInput
            ref={pin2Ref}
            editable={!loading}
            onPINChange={handlePIN2Change}
            onPINComplete={handlePIN2Complete}
            errorMessage={errorMessage2}
            testIDKey={TestIds.onboarding.createPin.confirmPin}
            accessibilityLabel={a11yLabel(tWithPrefix('ConfirmPIN'))}
          />
        </View>
        <Callout>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <ThemedText variant={'bold'} style={{ color: TextTheme.headingFour.color, flexShrink: 1 }}>
              {tWithPrefix('ThisPINIsUnique')}
            </ThemedText>
            <Icon name="information-outline" size={24} color={TextTheme.headingFour.color} />
          </View>
          <ThemedText>
            <ThemedText variant={'bold'}>{tWithPrefix('RememberPINWarning')}</ThemedText>{' '}
            {tWithPrefix('RememberPINDescription')}
          </ThemedText>
        </Callout>
        <View style={styles.pinCheckboxRow}>
          <CheckBoxRow
            title={tWithPrefix('IUnderstand')}
            // Plain spaces on purpose: NBSP-joined, this sentence is one token Apple's audit calls unreadable.
            accessibilityLabel={tWithPrefix('IUnderstand')}
            testID={testIdWithKey(TestIds.onboarding.createPin.understand)}
            checked={checked}
            onPress={() => {
              setCheckboxError(checked)
              setChecked(!checked)
            }}
            titleStyle={styles.pinCheckboxTitle}
          />
          {checkboxError ? (
            <ThemedText variant={'inlineErrorText'} style={styles.pinCheckboxError}>
              {tWithPrefix('MustCheckBox')}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </ScreenWrapper>
  )
}
