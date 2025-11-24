import useApi from '@/bcsc-theme/api/hooks/useApi'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
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
import { Alert, StyleSheet } from 'react-native'
import EmailTextInput from './EmailTextInput'

type EnterEmailScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EnterEmail>
  route: {
    params: {
      cardType: BCSCCardType
    }
  }
}

const EnterEmailScreen = ({ navigation, route }: EnterEmailScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { evidence } = useApi()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { cardType } = route.params
  const { ButtonLoading } = useAnimatedComponents()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      gap: Spacing.md,
    },
  })

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
      dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [{ email, emailConfirmed: false }] })
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
        onPress: () => {
          dispatch({
            type: BCDispatchAction.UPDATE_EMAIL,
            payload: [{ email: BCSC_EMAIL_NOT_PROVIDED, emailConfirmed: true }],
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
      {cardType !== BCSCCardType.Other ? (
        <Button
          buttonType={ButtonType.Secondary}
          onPress={handleSkip}
          title={t('BCSC.EnterEmail.EmailSkip')}
          accessibilityLabel={t('BCSC.EnterEmail.EmailSkip')}
          testID={'SkipButton'}
        />
      ) : null}
    </>
  )

  return (
    <ScreenWrapper
      keyboardActive={true}
      containerStyle={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.EnterEmail.EnterEmailAddress')}
      </ThemedText>
      {cardType !== BCSCCardType.Other ? (
        <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.EnterEmail.EmailDescription1')}</ThemedText>
      ) : null}
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.EnterEmail.EmailDescription2')}</ThemedText>
      <EmailTextInput handleChangeEmail={handleChangeEmail} />
      {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
    </ScreenWrapper>
  )
}

export default EnterEmailScreen
