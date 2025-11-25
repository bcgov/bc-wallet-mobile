import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createTermsOfUseWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { TERMS_OF_USE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebViewContent } from '../webview/WebViewContent'

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUse>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {JSX.Element} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = ({ navigation }: TermsOfUseScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [webViewIsLoaded, setWebViewIsLoaded] = useState(false)
  const { fontScale } = useWindowDimensions()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    webViewContainerLoading: {
      display: 'none',
    },
    webViewContainerLoaded: {
      flex: 1,
      marginHorizontal: Spacing.sm,
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    activityIndicator: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  // JavaScript to adjust font scaling on iOS devices
  const iosFontScaling =
    Platform.OS === 'ios'
      ? `
    const fontScale = ${fontScale};
    document.documentElement.style.fontSize = (16 * fontScale) + 'px';
    document.body.style.fontSize = (16 * fontScale) + 'px';
  `
      : ''

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <WebViewContent
        url={TERMS_OF_USE_URL}
        injectedJavascript={createTermsOfUseWebViewJavascriptInjection(ColorPalette) + iosFontScaling}
        onLoaded={() => setWebViewIsLoaded(true)}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingNotifications)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('BCSC.Onboarding.AcceptAndContinueButton')}
          // Content must be visible and loaded before user can accept terms
          disabled={!webViewIsLoaded}
        />
      </View>
    </SafeAreaView>
  )
}
