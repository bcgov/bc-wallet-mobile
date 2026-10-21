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
  /** On every verify menu; the anchor that proves the menu has opened. */
  reportProblem: 'Report a problem',
  /**
   * Leaves the flow for Home, KEEPING progress (`useLeaveVerification`). Offered to a deferred
   * verifier (Skip at the prompt, then the Home card) and in developer mode; never to a first-time
   * verifier (Continue at the prompt), and never on the verify prompt itself.
   */
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
  return label.replaceAll(' ', ' ')
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

/** The first displayed candidate for a row, or undefined when none is on screen right now. */
async function findDisplayedRow(label: string): Promise<ReturnType<typeof $> | undefined> {
  for (const selector of rowSelectors(label)) {
    const row = $(selector)
    if (await row.isDisplayed().catch(() => false)) {
      return row
    }
  }
  return undefined
}

/** Wait for a row to be displayed, polling out the modal's slide-in. */
async function waitForRow(label: string, timeout: number): Promise<ReturnType<typeof $>> {
  const deadline = Date.now() + timeout
  do {
    const row = await findDisplayedRow(label)
    if (row) {
      return row
    }
    await driver.pause(250)
  } while (Date.now() < deadline)

  throw new Error(`Help-menu row "${label}" did not appear within ${timeout}ms — is the menu open?`)
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
  const row = await waitForRow(label, timeout)
  await engine.waitForSteadyPosition(row)
  await row.click()
}

/**
 * Assert the open menu does NOT offer a row. Waits for the always-present "Report a problem" row
 * first, so an absent row is never mistaken for a menu that has not slid in yet. Leaves the menu open
 * for the caller to close.
 */
export async function expectHelpMenuRowAbsent(
  label: string,
  timeout: number = Timeouts.ELEMENT_VISIBLE
): Promise<void> {
  await waitForRow(HelpMenuRows.reportProblem, timeout)
  if (await findDisplayedRow(label)) {
    throw new Error(`Help-menu row "${label}" is offered here, but this user must not have it`)
  }
}

/** Close the help menu via its X. Needed after a row that leaves the menu up (e.g. a cancelled alert). */
export async function closeHelpMenu(): Promise<void> {
  await tapHelpMenuRow(CLOSE_LABEL)
}
