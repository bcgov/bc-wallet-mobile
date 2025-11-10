import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  KeyboardView,
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
import { Alert, StyleSheet, View } from 'react-native'
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
    contentContainer: {
      flex: 1,
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
      setError(t('Unified.EmailConfirmation.EmailError'))
      return
    }

    setError(null)

    try {
      setLoading(true)
      const { email_address_id } = await evidence.createEmailVerification(email)
      dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [{ email, emailConfirmed: false }] })
      navigation.navigate(BCSCScreens.EmailConfirmation, { emailAddressId: email_address_id })
    } catch (error: any) {
      setError(t('Unified.EmailConfirmation.ErrorTitle'))

      logger.error(t('Unified.EmailConfirmation.ErrorTitle'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    Alert.alert(t('Unified.EnterEmail.EmailSkip'), t('Unified.EnterEmail.EmailSkipMessage'), [
      {
        text: t('Unified.EnterEmail.EmailSkipButton'),
        style: 'cancel',
      },
      {
        text: t('Unified.EnterEmail.EmailSkipButton2'),
        onPress: () => {
          dispatch({
            type: BCDispatchAction.UPDATE_EMAIL,
            payload: [{ email: 'Not provided', emailConfirmed: true }],
          })
          navigation.goBack()
        },
      },
    ])
  }

  return (
    <KeyboardView>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.EnterEmail.EnterEmailAddress')}
          </ThemedText>
          {cardType !== BCSCCardType.Other ? (
            <ThemedText style={{ marginBottom: Spacing.md }}>{t('Unified.EnterEmail.EmailDescription1')}</ThemedText>
          ) : null}
          <ThemedText style={{ marginBottom: Spacing.md }}>{t('Unified.EnterEmail.EmailDescription2')}</ThemedText>
          <EmailTextInput handleChangeEmail={handleChangeEmail} />
          {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
        </View>
        <View style={styles.controlsContainer}>
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
              title={t('Unified.EnterEmail.Skip')}
              accessibilityLabel={t('Unified.EnterEmail.Skip')}
              testID={'SkipButton'}
            />
          ) : null}
        </View>
      </View>
    </KeyboardView>
  )
}

export default EnterEmailScreen
