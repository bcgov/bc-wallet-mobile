import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { HighlightDivider } from '@/bcsc-theme/components/HighlightDivider'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointList from '@/components/BulletPointList'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

type EnterEmailScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterEmail>
  route: {
    params: {
      cardProcess: BCSCCardProcess
    }
  }
}

const EnterEmailScreen = ({ navigation, route }: EnterEmailScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { evidence } = useApi()
  const { updateUserInfo, updateAccountFlags } = useSecureActions()
  const [store] = useStore<BCState>()
  const [email, setEmail] = useState(store.bcscSecure.emailAddress || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { cardProcess } = route.params
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()

  const isBCSCFlow = cardProcess !== BCSCCardProcess.NonBCSC

  const handleChangeEmail = (em: string) => {
    setEmail(em)
  }

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError(t('BCSC.EmailConfirmation.EmailError'))
      return
    }

    setError(null)

    try {
      setLoading(true)
      const { email_address_id } = await evidence.createEmailVerification(email)
      await updateAccountFlags({ userSkippedEmailVerification: false })
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
          await updateAccountFlags({ userSkippedEmailVerification: true })
          navigation.goBack()
        },
      },
    ])
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
      {isBCSCFlow ? (
        <Button
          buttonType={ButtonType.Secondary}
          onPress={handleSkip}
          title={t('BCSC.EnterEmail.EmailSkipButton2')}
          accessibilityLabel={t('BCSC.EnterEmail.EmailSkipButton2')}
          testID={'SkipButton'}
        />
      ) : null}
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
      <ThemedText variant={'headingThree'}>{t('BCSC.EnterEmail.EnterEmailAddress')}</ThemedText>

      <InputWithValidation
        id={'email'}
        label={t('BCSC.EnterEmail.EmailAddress')}
        hideLabel
        value={email}
        onChangeText={handleChangeEmail}
        error={error}
        onErrorClear={() => setError(null)}
        keyboardType={'email-address'}
        textInputProps={{
          maxLength: 50,
          autoCorrect: false,
          autoComplete: 'email',
          textContentType: 'emailAddress',
          placeholder: t('BCSC.EnterEmail.EmailExample'),
        }}
      />

      <HighlightDivider />

      <ThemedText>{t('BCSC.EnterEmail.EmailDescription1')}</ThemedText>
      <ThemedText variant={'headingFour'} style={{ color: ColorPalette.brand.primary }}>
        {t('BCSC.EnterEmail.EmailDescription2')}
      </ThemedText>
      <BulletPointList
        translationKeys={[
          'BCSC.EnterEmail.NotificationsBullet1',
          'BCSC.EnterEmail.NotificationsBullet2',
          'BCSC.EnterEmail.NotificationsBullet3',
        ]}
        iconColor={ColorPalette.brand.icon}
        iconSize={Spacing.xs}
      />
    </ScreenWrapper>
  )
}

export default EnterEmailScreen
