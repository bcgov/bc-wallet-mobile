import useApi from '@/bcsc-theme/api/hooks/useApi'
import CodeInput from '@/bcsc-theme/components/CodeInput'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  ToastType,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, Platform } from 'react-native'
import Toast from 'react-native-toast-message'

type EmailConfirmationScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EmailConfirmation>
  route: {
    params: {
      emailAddressId: string
    }
  }
}

const EmailConfirmationScreen = ({ navigation, route }: EmailConfirmationScreenProps) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { evidence } = useApi()
  const { updateUserInfo } = useSecureActions()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ButtonLoading } = useAnimatedComponents()
  const { emailAddressId } = route.params
  const [id, setId] = useState(emailAddressId)
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleSubmit = async () => {
    if (!code || code.length !== 6) {
      setError(t('BCSC.EmailConfirmation.CodeError'))
      return
    }

    setError(null)

    try {
      setLoading(true)
      await evidence.sendEmailVerificationCode(code, id)
      await updateUserInfo({
        email: store.bcscSecure.emailAddress,
        isEmailVerified: true,
      })
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    } catch (error) {
      setError(t('BCSC.EmailConfirmation.ErrorTitle'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError(null)

    try {
      setResendLoading(true)

      if (!store.bcscSecure.emailAddress) {
        logger.error('No email address found in store')
        throw new Error('No email address found in store, cannot resend verification code')
      }

      const { email_address_id } = await evidence.createEmailVerification(store.bcscSecure.emailAddress)
      setId(email_address_id)
      Toast.show({
        type: ToastType.Success,
        text1: t('BCSC.EmailConfirmation.CodeResent'),
        bottomOffset: Spacing.lg,
        autoHide: true,
        visibilityTime: 1500,
      })
    } catch (error) {
      setError(t('BCSC.EmailConfirmation.ErrorResendingCode'))
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoToEmail = () => {
    let url = 'mailto:'

    // On IOS we can open the mail application directly
    if (Platform.OS === 'ios') {
      url = 'message://'
    }

    Linking.openURL(url).catch(() => {
      Alert.alert(t('BCSC.EmailConfirmation.UnableToOpenEmail'), t('BCSC.EmailConfirmation.UnableToOpenEmailMessage'), [
        { text: t('BCSC.EmailConfirmation.OKButton') },
      ])
    })
  }

  const controls = (
    <>
      <Button
        buttonType={ButtonType.Primary}
        onPress={handleSubmit}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={'ContinueButton'}
      >
        {loading && <ButtonLoading />}
      </Button>
      <Button
        buttonType={ButtonType.Secondary}
        onPress={handleResendCode}
        title={t('BCSC.EmailConfirmation.ResendCode')}
        accessibilityLabel={t('BCSC.EmailConfirmation.ResendCode')}
        testID={'ResendCodeButton'}
      >
        {resendLoading && <ButtonLoading />}
      </Button>
      <Button
        buttonType={ButtonType.Secondary}
        onPress={handleGoToEmail}
        title={t('BCSC.EmailConfirmation.GoToEmail')}
        accessibilityLabel={t('BCSC.EmailConfirmation.GoToEmail')}
        testID={'GoToEmailButton'}
      />
    </>
  )

  return (
    <ScreenWrapper keyboardActive={true} controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.EmailConfirmation.VerifyYourEmail')}</ThemedText>
      <ThemedText>
        {t('BCSC.EmailConfirmation.EnterTheSixDigitCode')}{' '}
        <ThemedText variant={'bold'}>{store.bcscSecure.emailAddress}</ThemedText>
      </ThemedText>
      <CodeInput
        value={code}
        onChange={setCode}
        error={error}
        onErrorClear={() => setError(null)}
        textInputProps={{
          keyboardType: 'number-pad',
          textContentType: 'oneTimeCode',
          autoComplete: 'sms-otp',
          testID: testIdWithKey('EmailConfirmationCodeInput'),
          accessibilityLabel: 'Confirmation-Code-Input',
        }}
      />
    </ScreenWrapper>
  )
}

export default EmailConfirmationScreen
