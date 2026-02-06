import useApi from '@/bcsc-theme/api/hooks/useApi'
import useThirdPartyKeyboardWarning from '@/bcsc-theme/api/hooks/usethirdPartyKeyboardWarning'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EmailTextInput from './EmailTextInput'

type EnterEmailScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterEmail>
  route: {
    params: {
      cardProcess: BCSCCardProcess
    }
  }
}

const EnterEmailScreen = ({ navigation, route }: EnterEmailScreenProps) => {
  const { Spacing } = useTheme()
  const { evidence } = useApi()
  const { updateUserInfo } = useSecureActions()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { cardProcess } = route.params
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()
  const { showThirdPartyKeyboardWarning } = useThirdPartyKeyboardWarning()

  const handleChangeEmail = (em: string) => {
    setEmail(em)
  }

  useEffect(() => {
    showThirdPartyKeyboardWarning()
  }, [showThirdPartyKeyboardWarning])

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError(t('BCSC.EmailConfirmation.EmailError'))
      return
    }

    setError(null)

    try {
      setLoading(true)
      const { email_address_id } = await evidence.createEmailVerification(email)
      await updateUserInfo({ email, isEmailVerified: false })
      navigation.navigate(BCSCScreens.EmailConfirmation, { emailAddressId: email_address_id })
    } catch (error: any) {
      setError(t('BCSC.EmailConfirmation.ErrorTitle'))

      logger.error(t('BCSC.EmailConfirmation.ErrorTitle'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    Alert.alert(t('BCSC.EnterEmail.EmailSkip'), t('BCSC.EnterEmail.EmailSkipMessage'), [
      {
        text: t('BCSC.EnterEmail.EmailSkipButton'),
        style: 'cancel',
      },
      {
        text: t('BCSC.EnterEmail.EmailSkipButton2'),
        onPress: async () => {
          await updateUserInfo({
            email: BCSC_EMAIL_NOT_PROVIDED,
            isEmailVerified: true,
          })
          navigation.goBack()
        },
      },
    ])
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
      {cardProcess !== BCSCCardProcess.NonBCSC ? (
        <Button
          buttonType={ButtonType.Secondary}
          onPress={handleSkip}
          title={t('BCSC.EnterEmail.EmailSkipButton2')}
          accessibilityLabel={t('BCSC.EnterEmail.EmailSkipButton2')}
          testID={'SkipButton'}
        />
      ) : null}
    </>
  )

  return (
    <ScreenWrapper keyboardActive={true} controls={controls}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.EnterEmail.EnterEmailAddress')}
      </ThemedText>
      {cardProcess !== BCSCCardProcess.NonBCSC ? (
        <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.EnterEmail.EmailDescription1')}</ThemedText>
      ) : null}
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.EnterEmail.EmailDescription2')}</ThemedText>
      <EmailTextInput handleChangeEmail={handleChangeEmail} testID={'EmailInput'} />
      {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
    </ScreenWrapper>
  )
}

export default EnterEmailScreen
