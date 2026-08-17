/**
 * Helpers for dispatching `<scheme>://...` deep links to the app under test.
 *
 * Android uses Appium's `mobile: deepLink` (`am start -a VIEW`). iOS tries the same command WITH a
 * `bundleId` first — the app-scoped open, deterministic and prompt-free on iOS 16.4+ — and only on
 * an error falls back to the no-bundleId system open plus its "Open in <app>?" confirmation.
 *
 * The order matters on Sauce: the no-bundleId open is only safe on the OFFICIAL Appium
 * WebDriverAgent (pinned via `appiumVersion` in `configs/sauce/wdio.ios.sauce.rdc.conf.ts`). Sauce's
 * custom WDA (the default `latest`, and what a silently aged-out pin falls back to) instead routes it
 * through Siri, which has been observed to hang past the 60s command timeout and KILL the session.
 * The bundleId-scoped open never touches Siri on either WDA — it errors fast where unsupported
 * (runtime below 16.4, or the custom WDA's "does not support opening of URLs with given application"),
 * which is what makes the fallback safe to attempt.
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
    try {
      // App-scoped open: deterministic, no confirmation prompt, and NEVER Siri (see header).
      await driver.execute('mobile: deepLink', { url: retargeted, bundleId: appId })
      return
    } catch (err) {
      console.warn(`[deep-link] app-scoped open failed (${String(err).split('\n')[0]}); using the system open`)
    }
    // System open: works on any runtime/WDA that rejected the scoped form, at the cost of the
    // "Open in <app>?" prompt — and Siri, if the session is on Sauce's custom WDA.
    await driver.execute('mobile: deepLink', { url: retargeted })
    await acceptSystemAlert()
    return
  }
  await driver.execute('mobile: deepLink', { url, package: appId })
}
