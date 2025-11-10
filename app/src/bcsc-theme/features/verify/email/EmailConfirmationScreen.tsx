import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  KeyboardView,
  ThemedText,
  ToastType,
  useAnimatedComponents,
  useStore,
  useTheme,
} from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native'
import { CodeField, Cursor, useClearByFocusCell } from 'react-native-confirmation-code-field'
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
  const [store, dispatch] = useStore<BCState>()
  const { evidence } = useApi()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ButtonLoading } = useAnimatedComponents()
  const { emailAddressId } = route.params
  const [id, setId] = useState(emailAddressId)
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  })
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
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
    codeFieldRoot: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.md,
    },
    cell: {
      width: 50,
      height: 60,
      lineHeight: 60,
      fontSize: 32,
      backgroundColor: ColorPalette.grayscale.white,
      textAlign: 'center',
      textAlignVertical: 'center',
      borderRadius: 8,
      alignSelf: 'center',
      color: ColorPalette.brand.text,
    },
    focusCell: {
      borderColor: ColorPalette.brand.primary,
    },
  })

  const handleSubmit = async () => {
    if (!code || code.length !== 6) {
      setError(t('Unified.EmailConfirmation.CodeError'))
      return
    }

    setError(null)

    try {
      setLoading(true)
      await evidence.sendEmailVerificationCode(code, id)
      dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [{ email: store.bcsc.email, emailConfirmed: true }] })
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }],
        })
      )
    } catch (error) {
      setError(t('Unified.EmailConfirmation.ErrorTitle'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError(null)

    try {
      setResendLoading(true)
      const { email_address_id } = await evidence.createEmailVerification(store.bcsc.email!)
      setId(email_address_id)
      Toast.show({
        type: ToastType.Success,
        text1: t('Unified.EmailConfirmation.CodeResent'),
        bottomOffset: Spacing.lg,
        autoHide: true,
        visibilityTime: 1500,
      })
    } catch (error) {
      setError(t('Unified.EmailConfirmation.ErrorResendingCode'))
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
      Alert.alert(
        t('Unified.EmailConfirmation.UnableToOpenEmail'),
        t('Unified.EmailConfirmation.UnableToOpenEmailMessage'),
        [{ text: t('Global.OK') }]
      )
    })
  }

  return (
    <KeyboardView>
      <View style={styles.pageContainer}>
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
            {t('Unified.EmailConfirmation.VerifyYourEmail')}
          </ThemedText>
          <ThemedText>
            {t('Unified.EmailConfirmation.EnterTheSixDigitCode')}{' '}
            <ThemedText variant={'bold'}>{store.bcsc.email}</ThemedText>
          </ThemedText>
          <CodeField
            {...props}
            value={code}
            onChangeText={setCode}
            cellCount={6}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            renderCell={({ index, symbol, isFocused }) => (
              <ThemedText
                key={index}
                style={[styles.cell, isFocused && styles.focusCell]}
                onLayout={getCellOnLayoutHandler(index)}
              >
                {symbol || (isFocused ? <Cursor /> : null)}
              </ThemedText>
            )}
          />
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
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Secondary}
              onPress={handleResendCode}
              title={t('Unified.EmailConfirmation.ResendCode')}
              accessibilityLabel={t('Unified.EmailConfirmation.ResendCode')}
              testID={'ResendCodeButton'}
            >
              {resendLoading && <ButtonLoading />}
            </Button>
          </View>
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Secondary}
              onPress={handleGoToEmail}
              title={t('Unified.EmailConfirmation.GoToEmail')}
              accessibilityLabel={t('Unified.EmailConfirmation.GoToEmail')}
              testID={'GoToEmailButton'}
            />
          </View>
        </View>
      </View>
    </KeyboardView>
  )
}

export default EmailConfirmationScreen
