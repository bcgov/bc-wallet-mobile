import { BaseScreen } from '../screens/core/BaseScreen.js'
import { bcsc } from '../screens/core/index.js'
import { TestIds } from '../test-ids/registry.js'

const DEFAULT_APPEAR_TIMEOUT_MS = 5_000
const DEFAULT_DISMISS_TIMEOUT_MS = 3_000

const engine = new BaseScreen()

/**
 * Tap a button on the app's in-app alert (`emitAlert` → `BCSCAlertModal`), by its position in the
 * actions array. It is a React Native view, not a native popup, so `tapAlertButton` cannot reach it.
 * Kept out of `alerts.ts`, which `BaseScreen` imports.
 */
export async function tapInAppAlertAction(index: number, appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  const button = await engine.findByTestId(bcsc(`${TestIds.alertModal.action}${index}`))
  await button.waitForDisplayed({ timeout: appearTimeoutMs })
  // The modal fades in; on Android a tap mid-animation is swallowed
  await engine.waitForSteadyPosition(button)
  await button.click()
  await button.waitForDisplayed({ timeout: DEFAULT_DISMISS_TIMEOUT_MS, reverse: true })
  console.log(`[in-app-alert] Tapped action ${index}`)
}
