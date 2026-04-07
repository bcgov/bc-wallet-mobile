const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000

const IOS_APPROVE_ALERT_BUTTON_LABELS = ['Trust', 'Allow', 'Allow While Using App', 'Allow Once', 'OK', 'Continue']

function escapeIosSelectorValue(value: string): string {
  const bs = String.fromCodePoint(0x5c)
  const dq = String.fromCodePoint(0x22)
  // Backslashes first so we do not double-escape sequences that escape a quote.
  return value.replaceAll(bs, `${bs}${bs}`).replaceAll(dq, `${bs}${dq}`)
}

async function hasNativePopup(): Promise<boolean> {
  try {
    if (await driver.isAlertOpen()) return true
  } catch {
    // Some providers may not support isAlertOpen reliably.
  }

  try {
    const alert = await $('-ios class chain:**/XCUIElementTypeAlert')
    if (await alert.isDisplayed().catch(() => false)) return true
  } catch {
    // Selector can fail when no alert is present.
  }

  return false
}

/**
 * Accept an iOS system alert (e.g. notification/camera permission dialogs).
 *
 * Tries `driver.acceptAlert()` first, then falls back to tapping known
 * affirmative buttons by label (e.g. Allow/Trust/OK). Polls until the alert is
 * dismissed or the timeout expires.
 * Silently succeeds if no alert appears (the permission may already be granted).
 *
 * On Android this is a no-op — Android permissions are handled via
 * `appium:autoGrantPermissions`.
 */
export async function acceptSystemAlert(timeoutMs = POLL_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) return
  if (!(await hasNativePopup())) {
    console.log('[alerts] No native popup visible — skipping alert approval')
    return
  }

  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      await driver.acceptAlert()
      console.log('[alerts] Accepted system alert via driver.acceptAlert()')
      return
    } catch {
      // acceptAlert may not work on Sauce Labs RDC — fall back to tapping known labels
    }

    try {
      for (const label of IOS_APPROVE_ALERT_BUTTON_LABELS) {
        const escapedLabel = escapeIosSelectorValue(label)
        const button = await $(
          `-ios class chain:**/XCUIElementTypeButton[\`label == "${escapedLabel}" OR name == "${escapedLabel}" OR value == "${escapedLabel}"\`]`
        )

        if (await button.isDisplayed().catch(() => false)) {
          await button.click()
          console.log(`[alerts] Accepted system alert via "${label}" button tap`)
          return
        }
      }
    } catch {
      // Alert/button not found yet — keep polling
    }

    await driver.pause(POLL_INTERVAL_MS)
  }
  console.log('[alerts] No system alert found within timeout — continuing')
}
