const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000

/**
 * Accept an iOS system alert (e.g. notification/camera permission dialogs).
 *
 * Tries `driver.acceptAlert()` first, then falls back to tapping the "Allow"
 * button by label. Polls until the alert is dismissed or the timeout expires.
 * Silently succeeds if no alert appears (the permission may already be granted).
 *
 * On Android this is a no-op — Android permissions are handled via
 * `appium:autoGrantPermissions`.
 */
export async function acceptSystemAlert(timeoutMs = POLL_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) return

  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      await driver.acceptAlert()
      console.log('[alerts] Accepted system alert via driver.acceptAlert()')
      return
    } catch {
      // acceptAlert may not work on Sauce Labs RDC — fall back to tapping "Allow"
    }

    try {
      const allow = await $('-ios class chain:**/XCUIElementTypeButton[`label == "Allow"`]')
      if (await allow.isDisplayed()) {
        await allow.click()
        console.log('[alerts] Accepted system alert via Allow button tap')
        return
      }
    } catch {
      // Button not found yet — keep polling
    }

    await driver.pause(POLL_INTERVAL_MS)
  }
  console.log('[alerts] No system alert found within timeout — continuing')
}
