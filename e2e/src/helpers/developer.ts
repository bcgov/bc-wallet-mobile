import { Timeouts } from '../constants.js'
import { DeveloperScreen } from '../screens/developer.js'
import { swipeUpBy } from './gestures.js'

/**
 * Reaching the hidden Developer (IAS) menu.
 *
 * The app exposes two triggers and only one of them is drivable:
 *
 *  - `DeveloperModeTrigger` (the Intro / AccountSetup illustration) carries testID `DeveloperCounter`,
 *    but the same `Pressable` sets `accessibilityElementsHidden` + `importantForAccessibility=
 *    "no-hide-descendants"`. Both drivers read the accessibility tree, so the node is not in the
 *    snapshot on either platform and no selector can reach it — only a blind coordinate tap could,
 *    which would be a screen-geometry bet, not a test.
 *  - The version line in every Settings footer (`SettingsContent`) is wrapped in a
 *    `TouchableWithoutFeedback`. Its child text nodes ARE in the tree, and a tap on a child is routed
 *    to the parent responder — so it is selectable, scrollable-to, and works identically on both
 *    platforms. That is the route implemented here.
 *
 * Enabling developer mode is a persisted preference change: the `DeveloperMode` settings row appears
 * for the rest of the session, and developer-gated surfaces elsewhere (e.g. the QRCore Display tab)
 * become reachable. Only use this on a journey whose remaining checkpoints tolerate that.
 */

/** bifold's `useDeveloperMode` fires on the tap AFTER its 10-touch threshold — so eleven, not ten. */
const TAPS_TO_ENABLE_DEVELOPER_MODE = 11

/** Top-up taps allowed if one of the eleven was swallowed mid-scroll. */
const MAX_EXTRA_TAPS = 4

/** Swipes spent hunting the footer. The pre-auth settings surface often needs none. */
const MAX_FOOTER_SCROLLS = 8

/**
 * The footer's `Version <version> (<build>)` line. Matched by text prefix because the value is
 * build-dependent, and it is the only "Version …" string on a settings surface. The sibling
 * `BC Services Card` line is deliberately not used — that copy recurs elsewhere in the app.
 */
async function versionFooter() {
  return driver.isIOS
    ? $('-ios predicate string:type == "XCUIElementTypeStaticText" AND label BEGINSWITH "Version "')
    : $('android=new UiSelector().textStartsWith("Version ")')
}

/**
 * Scroll the settings version footer into view.
 *
 * Also positions the `DeveloperMode` row (which sits directly above the footer) on screen, so an
 * absence assertion made after this call means "not rendered" rather than "below the fold".
 */
export async function scrollToSettingsVersionFooter(): Promise<void> {
  for (let scroll = 0; scroll < MAX_FOOTER_SCROLLS; scroll++) {
    const footer = await versionFooter()
    if (await footer.isDisplayed().catch(() => false)) return
    await swipeUpBy(0.4)
    await driver.pause(150)
  }
  const footer = await versionFooter()
  await footer.waitForDisplayed({ timeout: Timeouts.ELEMENT_VISIBLE })
}

/**
 * Open the Developer menu from the Settings surface currently on screen (works pre-auth on
 * `AuthSettings`/`OnboardingSettings` as well as on `MainSettings`).
 *
 * Leaves the Developer screen on top; the caller asserts and drives it.
 */
export async function openDeveloperMenuFromSettings(): Promise<void> {
  await scrollToSettingsVersionFooter()

  // The counter is a `useRef` on the mounted SettingsContent, so every tap has to land on this
  // instance — no relaunching or re-navigating in between.
  for (let tap = 0; tap < TAPS_TO_ENABLE_DEVELOPER_MODE; tap++) {
    await (await versionFooter()).click()
  }

  // A swallowed tap only under-counts (taps below the threshold do nothing but increment), so top up
  // until the menu is on top. Once it opens the footer is gone and the loop exits on the check.
  for (let extra = 0; extra < MAX_EXTRA_TAPS; extra++) {
    if (await DeveloperScreen.isPresent(Timeouts.ELEMENT_VISIBLE)) return
    await (await versionFooter()).click()
  }

  await DeveloperScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}
