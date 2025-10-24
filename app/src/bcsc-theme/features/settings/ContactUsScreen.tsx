import { useTheme } from '@bifold/core'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import WebView from 'react-native-webview'

/**
 * Contact Us screen component that presents the contact information and support options.
 *
 * @returns {*} {JSX.Element} The ContactUsScreen component.
 */
export const ContactUsScreen = (): JSX.Element => {
  const { ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    webViewContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
  })

  const contactUsHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1, maximum-scale=1, telephone=yes">
        <title></title>
        <style>
            body {
                margin: 16px;
                color: ${ColorPalette.brand.secondary};
                background-color: ${ColorPalette.brand.primaryBackground};
                font-size: 18px;
                font-family: "BCSans-Regular", Verdana, sans-serif;
            }
            .header {
                font-size: 26px;
                font-family: "BCSans-Bold", Verdana, sans-serif;
                margin: 0px 0px 30px 0px;
                padding: 0px;
            }
            .sub-header {
                font-size: 18px;
                font-family: "BCSans-Bold", Verdana, sans-serif;
                margin: 0px 0px 20px 0px;
                padding: 0px;
            }
            a {
                color: ${ColorPalette.brand.link};
            }
        </style>
    </head>
    <body>
        <h4 class="header">Service BC Help Desk</h4>
        
        <h4 class="sub-header">Hours of service</h4>
        <p>Monday to Friday (except statutory holidays)<br/> 7:30 am - 5 pm Pacific time</p>
        
        <p>Canada and USA toll free <br/>
        <a href="tel:1-888-356-2741">1-888-356-2741</a></p>
        
        <p>Within lower mainland or outside Canada and USA <br/> <a href="tel:604-660-2355">604-660-2355</a></p>
        <p><br/></p>
        <h4 class="sub-header">Other contacts</h4>
        
        <p>Visit the <a href="https://www2.gov.bc.ca/gov/content?id=9F7F3266669643F79939055FB8F5EFE7">B.C. government website</a> to find who to contact for:
        
        <ul>
            <li>General information about the card</li>
            <li>Privacy-related questions</li>
            <li>Reporting a lost or stolen card</li>
            <li>Changing personal information</li>
        </ul>
        </p>
    </body>
    </html>
  `

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <WebView
        style={styles.webViewContainer}
        source={{ html: contactUsHTML }}
        startInLoadingState={true}
        renderLoading={() => (
          <SafeAreaView style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}>
            <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
          </SafeAreaView>
        )}
        bounces={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
      />
    </SafeAreaView>
  )
}
