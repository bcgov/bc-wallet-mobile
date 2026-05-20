import useApi from '@/bcsc-theme/api/hooks/useApi'
import CodeInput from '@/bcsc-theme/components/CodeInput'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { HighlightDivider } from '@/bcsc-theme/components/HighlightDivider'
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
  const { ColorPalette, Spacing } = useTheme()
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
          routes: [{ name: BCSCScreens.EmailVerified }],
        })
      )
    } catch (error) {
      setError(t('BCSC.EmailConfirmation.ErrorTitle'))
      Alert.alert(t('BCSC.EmailConfirmation.CouldNotVerifyTitle'), t('BCSC.EmailConfirmation.CodeDoesNotMatch'), [
        { text: t('Global.OK') },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendLoading) {
      return
    }

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

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        onPress={handleSubmit}
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={'ContinueButton'}
      >
        {loading && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center', color: 'black' }}>
        {t('BCSC.EmailConfirmation.EnterVerificationCode')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.EmailConfirmation.CodeSentTo')} </ThemedText>
      <ThemedText style={{ textAlign: 'center' }} variant={'bold'}>
        {store.bcscSecure.emailAddress}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.EmailConfirmation.EnterCodeWithin')}</ThemedText>
      <CodeInput
        value={code}
        onChange={setCode}
        error={error}
        separator
        variant={'underline'}
        onErrorClear={() => setError(null)}
        textInputProps={{
          keyboardType: 'number-pad',
          textContentType: 'oneTimeCode',
          autoComplete: 'sms-otp',
          testID: testIdWithKey('EmailConfirmationCodeInput'),
          accessibilityLabel: 'Confirmation-Code-Input',
        }}
      />
      <HighlightDivider />
      <ThemedText style={{ textAlign: 'center' }} variant={'caption'}>
        {t('BCSC.EmailConfirmation.CantFindCode')}
        <ThemedText
          variant={'caption'}
          style={{ color: ColorPalette.brand.link, fontWeight: 'bold' }}
          onPress={handleResendCode}
          accessibilityRole={'link'}
          accessibilityLabel={t('BCSC.EmailConfirmation.SendNewCode')}
          testID={'ResendCodeLink'}
        >
          {t('BCSC.EmailConfirmation.SendNewCode')}
        </ThemedText>
      </ThemedText>
    </ScreenWrapper>
  )
}

export default EmailConfirmationScreen
