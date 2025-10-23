import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { HELP_URL } from '@/constants'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'

interface HelpCentreScreenProps {
  navigation: StackNavigationProp<BCSCRootStackParams, BCSCScreens.HelpCentreScreen>
}

/**
 * Help Centre screen component that presents help documentation and support information.
 *
 * @returns {*} {JSX.Element} The HelpCentreScreen component.
 */
export const HelpCentreScreen = (props: HelpCentreScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    webViewContainer: {
      flex: 1,
      padding: theme.Spacing.md,
      gap: theme.Spacing.lg,
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
        source={{ uri: HELP_URL }}
        renderLoading={() => <ActivityIndicator size={'large'} style={styles.activityIndicator} />}
        bounces={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        // Remove header, footer, and navigation elements for a cleaner view
        injectedJavaScriptBeforeContentLoaded={`
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
          });
        `}
      />
    </SafeAreaView>
  )
}
