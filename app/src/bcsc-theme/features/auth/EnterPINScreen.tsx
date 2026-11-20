import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { PINInput } from '@/bcsc-theme/components/PINInput'
import { PinVerificationType, verifyPinWithLockout } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl, PIN_LENGTH } from '@/constants'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InteractionManager, View } from 'react-native'

interface EnterPINScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.EnterPIN>
}

export const EnterPINScreen = ({ navigation }: EnterPINScreenProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  // One unlock at a time: completing the PIN and pressing Continue both start one, and the second can land
  // before the re-render that disables the button
  const isVerifyingRef = useRef(false)
  const [currentPIN, setCurrentPIN] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { handleSuccessfulAuth } = useSecureActions()

  const { Spacing } = useTheme()

  const verifyPINAndContinue = useCallback(
    async (pin: string) => {
      if (isVerifyingRef.current) {
        return
      }
      isVerifyingRef.current = true
      // Once the unlock succeeds the button keeps spinning: the root slides this screen away
      let unlocked = false
      try {
        setLoading(true)
        setErrorMessage(undefined)

        // Wait for UI to update before running native methods that block the JS thread
        // This ensures loading indicators are visible
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve())
        })

        if (pin.length < PIN_LENGTH) {
          setErrorMessage(t('BCSC.PIN.PINTooShort'))
          setLoading(false)
          return
        }

        const verification = await verifyPinWithLockout(pin, logger)

        if (verification.type === PinVerificationType.Success) {
          // The rest of the wait stays on the button, not under the global overlay: for an unverified user
          // it is local work that ends within a few frames, and the root then slides from this screen. A
          // verified user's first Home loads the account; the root cuts to it and Home shows the waiting screen
          await handleSuccessfulAuth(verification.walletKey)
          unlocked = true
          logger.info('PIN verified successfully - navigating to main app')
        } else if (verification.type === PinVerificationType.Locked) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.Lockout }],
            })
          )
        } else {
          setErrorMessage(
            t(verification.isLastAttempt ? 'BCSC.EnterPIN.LastAttemptWarning' : 'BCSC.EnterPIN.IncorrectPIN')
          )
        }
      } catch (error) {
        setErrorMessage(t('BCSC.EnterPIN.VerifyError'))
        logger.error(`PIN verification error: ${error}`)
      } finally {
        if (!unlocked) {
          isVerifyingRef.current = false
          setLoading(false)
        }
      }
    },
    [logger, handleSuccessfulAuth, navigation, t]
  )

  const onPressContinue = useCallback(async () => {
    await verifyPINAndContinue(currentPIN)
  }, [currentPIN, verifyPINAndContinue])

  const navigateToWebView = useCallback(
    (url: string, title: string) => {
      navigation.navigate(BCSCScreens.AuthWebView, { url, title })
    },
    [navigation]
  )

  const onPressGetHelp = useCallback(() => {
    navigateToWebView(HelpCentreUrl.FORGOT_PIN, t('HelpCentre.Title'))
  }, [navigateToWebView, t])

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
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(TestIds.auth.enterPin.continue)}
        disabled={loading}
        onPress={onPressContinue}
      >
        {loading && <ButtonLoading />}
      </Button>
      <Button
        buttonType={ButtonType.Secondary}
        title={t('Global.GetHelp')}
        accessibilityLabel={a11yLabel(t('Global.GetHelp'))}
        testID={testIdWithKey(TestIds.auth.enterPin.getHelp)}
        onPress={onPressGetHelp}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} keyboardActive controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <View style={{ gap: Spacing.sm }}>
        <ThemedText variant={'bold'}>{t('BCSC.EnterPIN.Title')}</ThemedText>
        <PINInput
          testIDKey={TestIds.auth.enterPin.pin}
          onPINChange={handlePINChange}
          onPINComplete={handlePINComplete}
          editable={!loading}
          errorMessage={errorMessage}
          accessibilityLabel={a11yLabel(t('BCSC.EnterPIN.Title'))}
        />
        <ThemedText variant={'caption'}>{t('BCSC.EnterPIN.Description')}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}
