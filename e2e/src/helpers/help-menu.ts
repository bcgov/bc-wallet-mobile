import { Timeouts } from '../constants.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { bcsc } from '../screens/core/index.js'
import { TestIds } from '../test-ids/registry.js'

/**
 * The floating help menu (`FloatingHelpMenu`) — the header `HelpMenu` button every onboarding/verify
 * screen carries, and the only route to "Back to home" and "Restart verification process".
 *
 * Its rows have no testIDs, so they are matched by COPY — a localization edit to these strings breaks
 * these helpers, which is the accepted cost of not touching the app. The app also renders row labels
 * through `a11yLabel`, which joins words with non-breaking spaces, hence the candidate-selector hunt
 * below rather than a single matcher. Labels are fixed English copy, so nothing needs escaping.
 */

/** Verify-flow menu rows (`BCSC.HelpMenu.*`). Copy-matched — see the module note. */
export const HelpMenuRows = {
  /** Leaves the flow for Home, KEEPING progress (`useLeaveVerification`). */
  backToHome: 'Back to home',
  /** Confirm-then-wipe (`useRestartVerification`); hidden on the initial verify prompt. */
  restartVerification: 'Restart verification process',
} as const

/** The restart confirmation's buttons (`Alerts.RestartVerification.*` / `Global.Cancel`). */
export const RestartVerificationAlert = {
  cancel: 'Cancel',
  confirm: 'Restart Verification',
} as const

/** The menu's own close (X) control — `Global.Close`, passed directly so it is NOT nbsp-joined. */
const CLOSE_LABEL = 'Close'

const engine = new BaseScreen()

/**
 * Non-breaking-space form of a label — how `a11yLabel` renders every derived row label. Kept as an
 * escape: a literal U+00A0 is indistinguishable from a space in source, so a reformat could silently
 * turn every selector below into a miss.
 */
function nonBreaking(label: string): string {
  return label.replaceAll(' ', '\u00A0')
}

/**
 * Selectors that could match a menu row, most to least specific: the a11y label the app sets
 * (nbsp-joined), the same with plain spaces, and the inner `ThemedText` (Android only — iOS merges the
 * Pressable's children out of the tree).
 */
function rowSelectors(label: string): string[] {
  const nbsp = nonBreaking(label)
  if (driver.isIOS) {
    return [
      `-ios predicate string:label == "${nbsp}" OR name == "${nbsp}"`,
      `-ios predicate string:label == "${label}" OR name == "${label}"`,
    ]
  }
  return [
    `android=new UiSelector().description("${nbsp}")`,
    `android=new UiSelector().description("${label}")`,
    `android=new UiSelector().text("${label}")`,
  ]
}

/** Open the floating help menu from whichever screen is showing. */
export async function openHelpMenu(): Promise<void> {
  await engine.tapByTestId(bcsc(TestIds.common.help))
}

/**
 * Tap a help-menu row by its copy, waiting out the modal's slide-in first — a tap dispatched at the old
 * coordinates is silently swallowed on Android (see {@link BaseScreen.waitForSteadyPosition}).
 */
export async function tapHelpMenuRow(label: string, timeout: number = Timeouts.SCREEN_TRANSITION): Promise<void> {
  const deadline = Date.now() + timeout
  do {
    for (const selector of rowSelectors(label)) {
      const row = $(selector)
      if (await row.isDisplayed().catch(() => false)) {
        await engine.waitForSteadyPosition(row)
        await row.click()
        return
      }
    }
    await driver.pause(250)
  } while (Date.now() < deadline)

  throw new Error(`Help-menu row "${label}" did not appear within ${timeout}ms — is the menu open?`)
}

/** Close the help menu via its X. Needed after a row that leaves the menu up (e.g. a cancelled alert). */
export async function closeHelpMenu(): Promise<void> {
  await tapHelpMenuRow(CLOSE_LABEL)
}
