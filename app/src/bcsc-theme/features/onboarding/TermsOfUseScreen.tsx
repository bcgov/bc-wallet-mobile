import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createThemedWebViewScript } from '@/bcsc-theme/utils/webview-utils'
import { TERMS_OF_USE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <WebViewContent
        url={TERMS_OF_USE_URL}
        injectedJavascript={createThemedWebViewScript(ColorPalette)}
        onLoaded={() => setWebViewIsLoaded(true)}
      />

      <View style={styles.buttonContainer}>
        <Button
          title={t('Unified.Onboarding.AcceptAndContinueButton')}
          buttonType={ButtonType.Primary}
          onPress={() => {
            navigation.navigate(BCSCScreens.OnboardingNotifications)
          }}
          testID={testIdWithKey('AcceptAndContinue')}
          accessibilityLabel={t('Unified.Onboarding.AcceptAndContinueButton')}
          // Content must be visible and loaded before user can accept terms
          disabled={!webViewIsLoaded}
        />
      </View>
    </SafeAreaView>
  )
}
