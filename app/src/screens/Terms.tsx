import {
  Button,
  ButtonType,
  InfoBox,
  InfoBoxType,
  DispatchAction,
  AuthenticateStackParams,
  Screens,
  testIdWithKey,
  useTheme,
  useStore,
  useConfiguration,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const appleTermsUrl = 'https://www.apple.com/legal/internet-services/itunes/us/terms.html'
const bcWalletHomeUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet'
const digitalTrustHomeUrl = 'https://digital.gov.bc.ca/digital-trust/'
const bcWebPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/home/privacy'
const digitalWalletPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/privacy'

export const TermsVersion = '2'

const Terms = () => {
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const { enablePushNotifications } = useConfiguration()
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()
  const { ColorPallet, TextTheme } = useTheme()
  const agreedToPreviousTerms = store.onboarding.didAgreeToTerms && store.onboarding.didAgreeToTerms !== TermsVersion
  const style = StyleSheet.create({
    safeAreaView: {
      flex: 1,
    },
    scrollViewContentContainer: {
      padding: 20,
      flexGrow: 1,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    titleText: {
      ...TextTheme.normal,
      textDecorationLine: 'underline',
    },
    paragraph: {
      flexDirection: 'row',
      marginTop: 20,
    },
    enumeration: {
      ...TextTheme.normal,
      marginRight: 25,
    },
    link: {
      ...TextTheme.normal,
      color: ColorPallet.brand.link,
      textDecorationLine: 'underline',
      fontWeight: 'bold',
    },
  })

  const onSubmitPressed = useCallback(() => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: TermsVersion }],
    })

    if (!agreedToPreviousTerms) {
      navigation.navigate(Screens.CreatePIN)
    } else if (enablePushNotifications && !store.onboarding.didConsiderPushNotifications) {
      navigation.navigate(Screens.UsePushNotifications)
    }
  }, [])

  const openLink = async (url: string) => {
    // Only `https://` is allowed. Update manifest as needed.
    const supported = await Linking.canOpenURL(url)

    if (supported) {
      // Will open in device browser.
      await Linking.openURL(url)
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={style.safeAreaView}>
      <ScrollView contentContainerStyle={style.scrollViewContentContainer}>
        <Text style={[style.bodyText, { marginTop: 20 }]} testID={testIdWithKey('BodyText')}>
          Please click &nbsp;
          <Text
            style={{ textDecorationLine: 'underline', color: '#0171bb', marginTop: 20, fontSize: 18 }}
            onPress={() => {
              Linking.openURL('https://instntbunny.instnt.org/assets/html/toc.html')
            }}
          >
            here
          </Text>
          &nbsp;to review our terms and conditions before using this application.
        </Text>
      </ScrollView>
      {!(store.onboarding.didAgreeToTerms === TermsVersion && store.authentication.didAuthenticate) && (
        <View style={style.footer}>
          <Button
            title={t('Global.Accept')}
            accessibilityLabel={t('Global.Accept')}
            testID={testIdWithKey('Accept')}
            onPress={onSubmitPressed}
            buttonType={ButtonType.Primary}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

export default Terms
