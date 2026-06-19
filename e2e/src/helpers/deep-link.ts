/**
 * Helpers for dispatching `<scheme>://...` deep links to the app under test.
 *
 * Both iOS XCUITest and Android UiAutomator2 expose Appium's `mobile: deepLink`
 * command, but with platform-specific arg names (`bundleId` vs `package`).
 * This module wraps that and the matching app-id lookup so spec code can stay
 * platform-agnostic.
 */
import { acceptSystemAlert } from './alerts.js'
import type { DeepLinkPlatform } from './pairing-code.js'

/** Platform string the WDIO driver is currently bound to. */
export function currentPlatform(): DeepLinkPlatform {
  return driver.isIOS ? 'ios' : 'android'
}

/**
 * Capture the package (Android) or bundle id (iOS) of the currently running
 * app. Must be invoked while the app under test is in the foreground so the
 * driver query resolves to the right process.
 */
export async function getCurrentAppId(): Promise<string> {
  if (driver.isIOS) {
    const info = (await driver.execute('mobile: activeAppInfo')) as { bundleId?: string }
    if (!info?.bundleId) {
      throw new Error('Unable to resolve iOS bundle id from mobile: activeAppInfo')
    }
    return info.bundleId
  }
  return driver.getCurrentPackage()
}

/**
 * Dispatch a deep-link URL to the named app. Mirrors how the OS would
 * resolve a tap on a `<scheme>://...` link in a mobile browser — Appium
 * routes through Safari (iOS) or `am start -a VIEW` (Android), and the
 * registered URL scheme handler in the variant manifests catches it.
 *
 * iOS: We deliberately omit `bundleId` so WDA hands the URL off through
 * Safari instead of `XCUIApplication.open(URL:)` — the latter fails on
 * App Store / Enterprise-signed builds with "The current Xcode SDK does
 * not support opening of URLs with given application". The Safari path
 * triggers an "Open in BC Wallet" system prompt, which we accept.
 */
export async function dispatchDeepLink(url: string, appId: string): Promise<void> {
  if (driver.isIOS) {
    await driver.execute('mobile: deepLink', { url })
    await acceptSystemAlert()
    return
  }
  await driver.execute('mobile: deepLink', { url, package: appId })
}
