import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createTermsOfUseWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { TERMS_OF_USE_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
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
    scrollContainer: {
      paddingHorizontal: Spacing.sm,
      flex: 1,
    },
  })

  const controls = (
    <Button
      title={t('BCSC.Onboarding.AcceptAndContinueButton')}
      buttonType={ButtonType.Primary}
      onPress={() => navigation.navigate(BCSCScreens.OnboardingNotifications)}
      testID={testIdWithKey('AcceptAndContinue')}
      accessibilityLabel={t('BCSC.Onboarding.AcceptAndContinueButton')}
      disabled={!webViewIsLoaded}
    />
  )

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <WebViewContent
        url={TERMS_OF_USE_URL}
        injectedJavascript={createTermsOfUseWebViewJavascriptInjection(ColorPalette)}
        onLoaded={() => setWebViewIsLoaded(true)}
      />
    </ScreenWrapper>
  )
}
