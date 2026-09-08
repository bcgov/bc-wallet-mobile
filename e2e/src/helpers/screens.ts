import { Timeouts } from '../constants.js'
import type { ScreenPresence } from '../screens/core/defineScreen.js'
import { acceptSystemAlertsUntil } from './alerts.js'

/**
 * Dump the first several visible text strings on the current screen — makes "unexpected screen"
 * failures self-diagnosing by revealing which screen we actually landed on.
 */
export async function describeCurrentScreen(limit = 8): Promise<string> {
  const selector = driver.isIOS
    ? '-ios predicate string:type == "XCUIElementTypeStaticText"'
    : 'android=new UiSelector().className("android.widget.TextView")'
  const els = await $$(selector)
  const texts: string[] = []
  for (const el of els) {
    const t = driver.isIOS ? await el.getAttribute('label').catch(() => null) : await el.getText().catch(() => null)
    if (t) {
      texts.push(t)
    }
    if (texts.length >= limit) {
      break
    }
  }
  return texts.length ? texts.join(' | ') : '(no visible text found)'
}

/**
 * Wait for a camera screen to become interactive, accepting whatever permission dialog the OS raises
 * on the way.
 *
 * Every camera screen is a moving target for its first few seconds: it requests camera permission on
 * mount and swaps its ENTIRE tree while that is in flight (loading view → permission-denied fallback →
 * camera), and only then does the camera device resolve and the controls render. The old shape —
 * a single up-front `acceptSystemAlert()` followed by `expectVisible` — races that on two fronts:
 *
 *  - `acceptSystemAlert` polls a fixed window and gives up SILENTLY, so a dialog that appears later
 *    (common on Android real devices behind a heavy camera mount) leaves the app covered and the
 *    control we are about to assert on unreachable.
 *  - `expectVisible` blind-scrolls on a miss, which on a camera screen means ~10s of swipes across a
 *    live preview that has nothing to scroll, and a final error ("not visible after N scroll attempts")
 *    that describes the workaround instead of the cause.
 *
 * Interleaving the dialog check with a cheap `isPresent` probe removes both. Pass the screen's readiness
 * probe as `isReady`; on timeout the thrown error names what was actually on screen.
 */
export async function reachCameraScreen(
  name: string,
  isReady: () => Promise<boolean>,
  timeoutMs: number = Timeouts.CAMERA_READY
): Promise<void> {
  if (await acceptSystemAlertsUntil(isReady, { timeoutMs })) return
  throw new Error(`${name} did not become ready within ${timeoutMs}ms. On screen: ${await describeCurrentScreen()}`)
}

/** A screen object, or a cheap non-throwing probe for anything a screen object cannot name. */
export type ScreenProbe = ScreenPresence | (() => Promise<boolean>)

/** Per-candidate sampling budget inside {@link waitForAnyScreen} — polled, so an interval, not a wait. */
const ANY_SCREEN_PROBE_MS = 500

/**
 * Wait until one of `candidates` is on screen and say which — for the seams where the app may
 * legitimately land on either of two screens (a relaunch that resumes into verification, or Home).
 * Never scrolls; on timeout the thrown error names what was actually on screen.
 */
export async function waitForAnyScreen<K extends string>(
  candidates: Record<K, ScreenProbe>,
  timeoutMs: number = Timeouts.SCREEN_TRANSITION
): Promise<K> {
  const deadline = Date.now() + timeoutMs
  const entries = Object.entries(candidates) as [K, ScreenProbe][]
  for (;;) {
    for (const [key, probe] of entries) {
      const present = typeof probe === 'function' ? await probe() : await probe.isPresent(ANY_SCREEN_PROBE_MS)
      if (present) return key
    }
    if (Date.now() > deadline) {
      throw new Error(
        `None of [${entries.map(([key]) => key).join(', ')}] appeared within ${timeoutMs}ms. On screen: ${await describeCurrentScreen()}`
      )
    }
  }
}
