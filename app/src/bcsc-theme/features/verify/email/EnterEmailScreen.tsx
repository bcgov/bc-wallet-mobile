import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { HighlightDivider } from '@/bcsc-theme/components/HighlightDivider'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useFocusFirstInvalidField from '@/bcsc-theme/hooks/useFocusFirstInvalidField'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { EMAIL_MAX_LENGTH, emailSchema, parseField } from '@/bcsc-theme/utils/validation'
import BulletPointList from '@/components/BulletPointList'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { BCState } from '@/store'
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
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

const FIELD_ORDER = ['email'] as const

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
  const { scrollViewRef, inputRefs, onFieldLayout, focusFirstInvalidField } = useFocusFirstInvalidField(FIELD_ORDER)

  const isBCSCFlow = cardProcess !== BCSCCardProcess.NonBCSC

  const handleChangeEmail = (em: string) => {
    setEmail(em)
  }

  const handleSubmit = async () => {
    const parsedEmail = parseField(emailSchema, email)

    if (!parsedEmail.ok) {
      const message = t(parsedEmail.errorKey)
      setError(message)
      focusFirstInvalidField({ email: message })
      return
    }

    setError(null)

    try {
      setLoading(true)
      const normalizedEmail = parsedEmail.value
      const { email_address_id } = await evidence.createEmailVerification(normalizedEmail)
      await updateAccountFlags({ userSkippedEmailVerification: false })
      await updateUserInfo({ email: normalizedEmail, isEmailVerified: false })
      navigation.navigate(BCSCScreens.EmailConfirmation, { emailAddressId: email_address_id })
    } catch (error: any) {
      const message = t('BCSC.EmailConfirmation.ErrorTitle')
      setError(message)

      // A handled error has already surfaced its own UI (eg. the session-expired modal); refocusing would
      // raise the keyboard over it, and the API client has already logged it.
      if (isHandledAppError(error)) {
        return
      }

      focusFirstInvalidField({ email: message })
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
          // Move on as a verified email does: on a resume this screen is the only route, with nothing to go back to
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: BCSCScreens.VerificationMethodSelection }],
            })
          )
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
        testID={testIdWithKey(TestIds.verify.enterEmail.continue)}
      >
        {loading && <ButtonLoading />}
      </Button>
      {isBCSCFlow ? (
        <Button
          buttonType={ButtonType.Secondary}
          onPress={handleSkip}
          title={t('BCSC.EnterEmail.EmailSkipButton2')}
          accessibilityLabel={t('BCSC.EnterEmail.EmailSkipButton2')}
          testID={testIdWithKey(TestIds.verify.enterEmail.skip)}
        />
      ) : null}
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewRef={scrollViewRef}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.EnterEmail.EnterEmailAddress')}</ThemedText>

      <InputWithValidation
        ref={inputRefs.email}
        id={'email'}
        label={t('BCSC.EnterEmail.EmailAddress')}
        hideLabel
        value={email}
        onChangeText={handleChangeEmail}
        error={error}
        onErrorClear={() => setError(null)}
        keyboardType={'email-address'}
        onLayout={onFieldLayout('email')}
        textInputProps={{
          maxLength: EMAIL_MAX_LENGTH,
          autoCorrect: false,
          autoComplete: 'email',
          textContentType: 'emailAddress',
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
