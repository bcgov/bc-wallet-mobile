import { Timeouts } from '../constants.js'

/**
 * Selector for the platform's native in-app WebView container. `react-native-webview` renders a
 * native `android.webkit.WebView` (Android) / `WKWebView` → `XCUIElementTypeWebView` (iOS). Its
 * presence is a testID-free positive signal that an in-app webview has opened — the only reliable
 * marker for a webview whose content renders no testIDs and whose stack back button is not
 * addressable (notably the AuthWebView; see screens/auth.ts).
 */
function webViewSelector(): string {
  return driver.isIOS
    ? '-ios class chain:**/XCUIElementTypeWebView'
    : 'android=new UiSelector().className("android.webkit.WebView")'
}

/**
 * Wait until an in-app WebView is displayed (i.e. tapping a link pushed the webview on top).
 *
 * Prefer this over asserting the previous screen "left": a pushed screen keeps the previous one
 * mounted underneath, so on Android the underlying screen's elements still report as displayed
 * (XCUITest hides the covered screen, which is why an absence check passes on iOS but not Android).
 */
export async function expectWebViewOpen(timeout: number = Timeouts.SCREEN_TRANSITION): Promise<void> {
  await $(webViewSelector()).waitForDisplayed({ timeout })
}
