import { HELP_URL } from '@/constants'
import { useTheme } from '@bifold/core'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'

/**
 * Help Centre screen component that presents help documentation and support information.
 *
 * @returns {*} {JSX.Element} The HelpCentreScreen component.
 */
export const HelpCentreScreen = (): JSX.Element => {
  const theme = useTheme()
  const { ColorPalette } = theme

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    webViewContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
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
        startInLoadingState={true}
        renderLoading={() => (
          <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
            <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
          </SafeAreaView>
        )}
        bounces={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        injectedJavaScriptBeforeContentLoaded={`
          document.addEventListener('DOMContentLoaded', function() {
            document.body.style.backgroundColor = '${ColorPalette.brand.primaryBackground}';
            document.body.style.color = '${ColorPalette.brand.secondary}';
            document.querySelectorAll('a').forEach(link => {
              link.style.color = '${ColorPalette.brand.link}';
            });
          });
        `}
      />
    </SafeAreaView>
  )
}
