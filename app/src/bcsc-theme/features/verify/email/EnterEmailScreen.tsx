import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, KeyboardView, ThemedText, useAnimatedComponents, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import EmailTextInput from './EmailTextInput'

type EnterEmailScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.EnterEmailScreen>
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
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const handleChangeEmail = (em: string) => {
    setEmail(em)
  }

  const handleSubmit = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setError(null)

    try {
      setLoading(true)
      const { email_address_id } = await evidence.createEmailVerification(email)
      dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [{ email, emailConfirmed: false }] })
      navigation.navigate(BCSCScreens.EmailConfirmationScreen, { emailAddressId: email_address_id })
    } catch (error) {
      setError('Error submitting email')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    Alert.alert(
      `Are you sure you don't want to provide it?`,
      `It is less secure without it as we can't notify you of logins or changes to your account.`,
      [
        {
          text: 'Provide email address',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            dispatch({
              type: BCDispatchAction.UPDATE_EMAIL,
              payload: [{ email: 'Not provided', emailConfirmed: true }],
            })
            navigation.goBack()
          },
        },
      ],
    )
  }

  return (
    <KeyboardView>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            Enter your email address
          </ThemedText>
          {cardType !== BCSCCardType.Other ? (
            <ThemedText style={{ marginBottom: Spacing.md }}>
              It is recommended that you provide one for security purposes.
            </ThemedText>
          ) : null}
          <ThemedText style={{ marginBottom: Spacing.md }}>
            You will only get emails about logins and changes to your account. It also makes it quicker to set up
            another mobile card.
          </ThemedText>
          <EmailTextInput handleChangeEmail={handleChangeEmail} />
          {error && <ThemedText variant={'inlineErrorText'}>{error}</ThemedText>}
        </View>
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            onPress={handleSubmit}
            title={'Continue'}
            accessibilityLabel={'Continue'}
            testID={'ContinueButton'}
          >
            {loading && <ButtonLoading />}
          </Button>
          {cardType !== BCSCCardType.Other ? (
            <View style={styles.secondButton}>
              <Button
                buttonType={ButtonType.Secondary}
                onPress={handleSkip}
                title={'Skip'}
                accessibilityLabel={'Skip'}
                testID={'SkipButton'}
              />
            </View>
          ) : null}
        </View>
      </View>
    </KeyboardView>
  )
}

export default EnterEmailScreen
