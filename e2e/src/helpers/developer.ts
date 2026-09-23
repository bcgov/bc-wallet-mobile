import { Timeouts } from '../constants.js'
import { DeveloperScreen } from '../screens/developer.js'
import { swipeUpBy } from './gestures.js'

/**
 * Reaching the hidden Developer (IAS) menu, by tapping the version line in a Settings footer.
 *
 * The app's other trigger — `DeveloperCounter` on the Intro illustration — is unusable: the same
 * `Pressable` sets `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`,
 * so neither driver can see it.
 *
 * Enabling developer mode persists: the `DeveloperMode` settings row and other dev-gated surfaces
 * (e.g. the QRCore Display tab) stay available for the rest of the session.
 */

/** bifold's `useDeveloperMode` fires on the tap AFTER its 10-touch threshold — so eleven, not ten. */
const TAPS_TO_ENABLE_DEVELOPER_MODE = 11

/** Top-up taps allowed if one of the eleven was swallowed. */
const MAX_EXTRA_TAPS = 4

const MAX_FOOTER_SCROLLS = 8

/** The footer's `Version <version> (<build>)` line — prefix-matched, since the value is build-dependent. */
async function versionFooter() {
  return driver.isIOS
    ? $('-ios predicate string:type == "XCUIElementTypeStaticText" AND label BEGINSWITH "Version "')
    : $('android=new UiSelector().textStartsWith("Version ")')
}

/**
 * Scroll the settings version footer into view. Also brings the `DeveloperMode` row (directly above
 * it) on screen, so an absence assertion after this means "not rendered", not "below the fold".
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

/** Read the footer's `Version <version> (<build>)` line, scrolling it into view first. */
export async function readSettingsVersionFooter(): Promise<string> {
  await scrollToSettingsVersionFooter()
  return (await versionFooter()).getText()
}

/**
 * Open the Developer menu from whichever Settings surface is on screen (pre-auth `AuthSettings` /
 * `OnboardingSettings` as well as `MainSettings`), leaving it on top for the caller.
 */
export async function openDeveloperMenuFromSettings(): Promise<void> {
  await scrollToSettingsVersionFooter()

  // The counter is a `useRef` on the mounted SettingsContent — every tap must land on this instance.
  for (let tap = 0; tap < TAPS_TO_ENABLE_DEVELOPER_MODE; tap++) {
    await (await versionFooter()).click()
  }

  // A swallowed tap only under-counts, so top up until the menu opens.
  for (let extra = 0; extra < MAX_EXTRA_TAPS; extra++) {
    if (await DeveloperScreen.isPresent(Timeouts.ELEMENT_VISIBLE)) return
    await (await versionFooter()).click()
  }

  await DeveloperScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}
