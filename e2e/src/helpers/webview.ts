import { Timeouts } from '../constants.js'
import { describeCurrentScreen } from './screens.js'

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

/** Exact-text selector. Header titles are fixed English copy (`BCSC.Screens.*`), so nothing needs escaping. */
function textSelector(text: string): string {
  return driver.isIOS ? `-ios predicate string:label == "${text}"` : `android=new UiSelector().text("${text}")`
}

/**
 * Does the stack header above `webView` read `title`? Only a displayed match ABOVE the webview's top
 * edge counts — the page itself may repeat the words (a heading, a nav link), so a bare text match
 * could pass on the wrong page.
 */
async function isHeaderTitleDisplayed(webView: ReturnType<typeof $>, title: string): Promise<boolean> {
  const webViewTop = (await webView.getLocation()).y
  for (const el of await $$(textSelector(title))) {
    if (!(await el.isDisplayed().catch(() => false))) continue
    if ((await el.getLocation()).y < webViewTop) return true
  }
  return false
}

export interface ExpectWebViewOpenOptions {
  /** The pushed screen's header title — the one native field that tells two pushes of the SAME
   *  WebView route apart (Settings' Help and Contact Us rows both open `MainWebView`). */
  title?: string
  timeout?: number
}

/**
 * Wait until an in-app WebView is displayed (i.e. tapping a link pushed the webview on top) and, given
 * `title`, until the native stack header reads it. Both signals are testID-free and ignore the page
 * content, which is external and out of scope by design.
 *
 * Prefer this over asserting the previous screen "left": a pushed screen keeps the previous one
 * mounted underneath, so on Android the underlying screen's elements still report as displayed
 * (XCUITest hides the covered screen, which is why an absence check passes on iOS but not Android).
 */
export async function expectWebViewOpen({
  title,
  timeout = Timeouts.SCREEN_TRANSITION,
}: ExpectWebViewOpenOptions = {}): Promise<void> {
  const webView = $(webViewSelector())
  try {
    await webView.waitForDisplayed({ timeout })
  } catch {
    throw new Error(`No in-app WebView displayed within ${timeout}ms. On screen: ${await describeCurrentScreen()}`)
  }
  if (!title) return
  try {
    await driver.waitUntil(() => isHeaderTitleDisplayed(webView, title), { timeout })
  } catch {
    throw new Error(
      `WebView opened but its header never read "${title}" within ${timeout}ms. On screen: ${await describeCurrentScreen()}`
    )
  }
}
