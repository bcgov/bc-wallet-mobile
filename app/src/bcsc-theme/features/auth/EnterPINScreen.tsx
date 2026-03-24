import { a11yLabel } from '@utils/accessibility'
import { PINInput } from '@/bcsc-theme/components/PINInput'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl, PIN_LENGTH } from '@/constants'
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
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InteractionManager, View } from 'react-native'
import { verifyPIN } from 'react-native-bcsc-core'

interface EnterPINScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.EnterPIN>
}

export const EnterPINScreen = ({ navigation }: EnterPINScreenProps) => {
  const { t } = useTranslation()
  const { ButtonLoading } = useAnimatedComponents()
  const [loading, setLoading] = useState(false)
  const [currentPIN, setCurrentPIN] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { handleSuccessfulAuth } = useSecureActions()

  const { Spacing } = useTheme()

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
        title={t('Global.GetHelp')}
        accessibilityLabel={a11yLabel(t('Global.GetHelp'))}
        testID={testIdWithKey('GetHelp')}
        onPress={onPressGetHelp}
      />
    </>
  )

  return (
    <ScreenWrapper keyboardActive controls={controls}>
      <View style={{ gap: Spacing.sm }}>
        <ThemedText variant={'bold'}>{`Enter your 6-digit PIN`}</ThemedText>
        <PINInput onPINChange={handlePINChange} onPINComplete={handlePINComplete} errorMessage={errorMessage} />
        <ThemedText variant={'caption'}>{`The one you chose to secure this app`}</ThemedText>
      </View>
    </ScreenWrapper>
  )
}
