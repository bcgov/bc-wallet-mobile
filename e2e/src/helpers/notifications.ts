/**
 * Handles the native notification permission dialog that appears when the app requests
 * notification access (e.g. after tapping "Continue" on the Notifications onboarding screen).
 * Safe to call even when no dialog is present (e.g. already granted).
 *
 * iOS: "Allow [App] to send you notifications?" with "Don't Allow" and "Allow"
 * Android 13+: Runtime permission dialog with "Don't allow" and "Allow"
 *
 * Runs on Sauce Labs RDC as well — if the system dialog appears it must be accepted or the
 * next onboarding step will time out; when no dialog is shown the accept helpers no-op.
 */
export async function acceptNotificationPermissionIfPresent(): Promise<void> {
  await acceptPermissionDialogIfPresent()
}

/**
 * Dismisses the native camera permission dialog after the app requests camera access
 * (e.g. after tapping Take Photo). Same UI patterns as notification runtime permission.
 * Safe when no dialog is shown (already granted). Same Sauce Labs behaviour as
 * {@link acceptNotificationPermissionIfPresent}.
 */
export async function acceptCameraPermissionIfPresent(): Promise<void> {
  await acceptPermissionDialogIfPresent()
}

async function acceptPermissionDialogIfPresent(): Promise<void> {
  await new Promise((r) => setTimeout(r, 1_500))

  if (driver.isIOS) {
    await acceptIosAllowPermissionDialog()
  } else if (driver.isAndroid) {
    await acceptAndroidAllowPermissionDialog()
  }
}

async function acceptIosAllowPermissionDialog(): Promise<void> {
  const maxAttempts = 5
  const intervalMs = 1_000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // mobile: alert works for in-app and system permission dialogs
      await driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Allow' })
      return
    } catch {
      // Fallback: some system dialogs are managed by springboard
      let handled = false
      try {
        await driver.updateSettings({ defaultActiveApplication: 'com.apple.springboard' })
        const allowButton = await $('~Allow')
        if (await allowButton.isDisplayed()) {
          await allowButton.click()
          handled = true
        }
      } catch {
        // Allow button not found — dialog may not be present
      } finally {
        await driver.updateSettings({ defaultActiveApplication: 'auto' })
      }
      if (handled) return

      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs))
      }
    }
  }
}

async function acceptAndroidAllowPermissionDialog(): Promise<void> {
  const maxAttempts = 5
  const intervalMs = 1_000

  // Common selectors for the Allow button (locale may vary)
  const allowSelectors = [
    'android=new UiSelector().text("Allow")',
    'android=new UiSelector().textContains("Allow")',
    'android=new UiSelector().resourceId("com.android.packageinstaller:id/permission_allow_button")',
    'android=new UiSelector().resourceId("com.android.permissioncontroller:id/permission_allow_button")',
  ]

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const selector of allowSelectors) {
      try {
        const allowButton = await $(selector)
        if (await allowButton.isDisplayed()) {
          await allowButton.click()
          return
        }
      } catch {
        // Selector didn't match — try next
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
}
