import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TERMS_OF_USE_URL } from '@/constants'
import { Button, ButtonType, ContentGradient, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import * as PushNotifications from '../../../utils/PushNotificationsHelper'
import { WebViewContent } from '../webview/WebViewContent'

// Slightly larger height than default to make more obvious given terms of use font size
const TERMS_CONTENT_GRADIENT_HEIGHT = 60

interface TermsOfUseScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingTermsOfUse>
}

/**
 * Terms of Use screen component that presents the application's terms of use to the user.
 *
 * @returns {*} {React.ReactElement} The TermsOfUseScreen component.
 */
export const TermsOfUseScreen = ({ navigation }: TermsOfUseScreenProps): React.ReactElement => {
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
    <View style={{ width: '100%' }}>
      <ContentGradient backgroundColor={ColorPalette.brand.primaryBackground} height={TERMS_CONTENT_GRADIENT_HEIGHT} />
      <Button
        title={t('BCSC.Onboarding.AcceptAndContinueButton')}
        buttonType={ButtonType.Primary}
        onPress={async () => {
          const status = await PushNotifications.status()

          // if permission is granted, skip notification screen
          if (status === PushNotifications.NotificationPermissionStatus.GRANTED) {
            return navigation.navigate(BCSCScreens.OnboardingSecureApp)
          }

          navigation.navigate(BCSCScreens.OnboardingNotifications)
        }}
        testID={testIdWithKey('AcceptAndContinue')}
        accessibilityLabel={t('BCSC.Onboarding.AcceptAndContinueButton')}
        disabled={!webViewIsLoaded}
      />
    </View>
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={styles.scrollContainer}>
      <WebViewContent url={TERMS_OF_USE_URL} onLoaded={() => setWebViewIsLoaded(true)} />
    </ScreenWrapper>
  )
}
