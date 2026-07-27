/**
 * Helpers for dispatching `<scheme>://...` deep links to the app under test.
 *
 * Android uses Appium's `mobile: deepLink` (`am start -a VIEW`). iOS uses the same command but WITHOUT
 * a `bundleId` — the plain system open — then accepts the "Open in <app>?" confirmation. Passing a
 * `bundleId` routes through the app-scoped open, which errors unless the device runtime is iOS 16.4+
 * ("The current OS runtime does not support opening URLs with a given application"); the system open
 * has no such requirement and works on any iOS.
 *
 * Requires the OFFICIAL Appium WebDriverAgent (pinned via `appiumVersion` in
 * `configs/sauce/wdio.ios.sauce.rdc.conf.ts`). Sauce's custom WDA (the default `latest`) instead falls
 * back to Siri for the no-bundleId open, which is slow and non-deterministic.
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
 * Dispatch a deep-link URL to the named app. Mirrors how the OS would resolve a tap on a
 * `<scheme>://...` link in a mobile browser, and the registered URL-scheme handler in the variant
 * manifests catches it.
 */
export async function dispatchDeepLink(url: string, appId: string): Promise<void> {
  if (driver.isIOS) {
    // The pairing site mints the link with whatever env-scheme its UA maps to (e.g. `iddev`), but the
    // installed build may register a DIFFERENT one (`idtest`, …). Dispatching an unregistered scheme
    // fails with LSApplicationNotFound (-10814). For BCSC the iOS bundle id equals the URL scheme, so
    // retarget the link at the running app's own scheme (a no-op when they already match).
    const retargeted = url.replace(/^[^:]+:\/\//, `${appId}://`)
    // No `bundleId`: the system open avoids the iOS-16.4 app-scoped-open requirement, and on the
    // official WDA it does not fall back to Siri. It raises an "Open in <app>?" prompt, which we accept.
    await driver.execute('mobile: deepLink', { url: retargeted })
    await acceptSystemAlert()
    return
  }
  await driver.execute('mobile: deepLink', { url, package: appId })
}
