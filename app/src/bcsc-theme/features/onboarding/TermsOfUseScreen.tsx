import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { createTermsOfUseWebViewJavascriptInjection } from '@/bcsc-theme/utils/webview-utils'
import { TERMS_OF_USE_URL } from '@/constants'
import { useWorkflowNavigation } from '@/contexts/WorkflowNavigationContext'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
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
  const { goToNextScreen } = useWorkflowNavigation()
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
      onPress={async () => {
        const status = await PushNotifications.status()

        // if permission is granted or blocked, skip notification screen
        if (
          status === PushNotifications.NotificationPermissionStatus.GRANTED ||
          status === PushNotifications.NotificationPermissionStatus.BLOCKED
        ) {
          // ensure that the next navigation isn't hit while transitioning
          // needs to skip notifications
          return goToNextScreen(BCSCScreens.OnboardingSecureApp)
        }

        goToNextScreen()
      }}
      testID={testIdWithKey('AcceptAndContinue')}
      accessibilityLabel={t('BCSC.Onboarding.AcceptAndContinueButton')}
      disabled={!webViewIsLoaded}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <WebViewContent
        url={TERMS_OF_USE_URL}
        injectedJavascript={createTermsOfUseWebViewJavascriptInjection(ColorPalette)}
        onLoaded={() => setWebViewIsLoaded(true)}
      />
    </ScreenWrapper>
  )
}
