import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TERMS_OF_USE_URL } from '@/constants'
import { BCState } from '@/store'
import { Button, ButtonType, DispatchAction, testIdWithKey, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUseScreen>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {JSX.Element} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = (props: TermsOfUseScreenProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [, dispatch] = useStore<BCState>()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    webViewContainer: {
      flex: 1,
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
    },
    buttonContainer: {
      paddingTop: theme.Spacing.md,
      paddingHorizontal: theme.Spacing.md,
    },
    activityIndicator: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <WebView
        style={styles.webViewContainer}
        source={{ uri: TERMS_OF_USE_URL }}
        renderLoading={() => <ActivityIndicator size={'large'} style={styles.activityIndicator} />}
        bounces={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        startInLoadingState={true}
        // Remove header, footer, and navigation elements for a cleaner view
        injectedJavaScriptBeforeContentLoaded={`
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
          });
        `}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={t('Unified.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            props.navigation.navigate(BCSCScreens.OnboardingNotificationsScreen)
            dispatch({ type: DispatchAction.DID_AGREE_TO_TERMS, payload: [true] })
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('Unified.Onboarding.AcceptAndContinueButton')}
        />
      </View>
    </SafeAreaView>
  )
}
