import { Timeouts } from '../constants.js'

/** App-state values from Appium's `queryAppState` (`mobile: queryAppState` on both drivers). */
const APP_STATE_FOREGROUND = 4

/** How often to re-ask for the app state while waiting for the handoff to take effect. */
const HANDOFF_POLL_MS = 500

/**
 * Confirm a tap handed the user off to the EXTERNAL browser, then bring the app back.
 *
 * The one observable a browser handoff leaves on our side is the app losing the foreground
 * (`queryAppState` dropping below 4 — XCUITest and UiAutomator2 both implement it); what the browser
 * does is out of scope by design, so this never reads browser content and never taps browser chrome
 * (first-run dialogs, profile pickers — all irrelevant, `activateApp` returns regardless).
 *
 * Read `getCurrentAppId()` BEFORE the tap (it needs the app foregrounded) and assert the expected
 * screen after — some handoffs reset navigation first (quick-login resets to Home), others leave the
 * screen mounted (GoToServiceClient, the external settings links).
 */
export async function returnFromBrowserHandoff(
  appId: string,
  timeoutMs: number = Timeouts.SCREEN_TRANSITION
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const state = await driver.queryAppState(appId)
    if (state !== APP_STATE_FOREGROUND) break
    if (Date.now() > deadline) {
      throw new Error(`App ${appId} never left the foreground within ${timeoutMs}ms — no browser handoff happened`)
    }
    await driver.pause(HANDOFF_POLL_MS)
  }
  await driver.activateApp(appId)
}
