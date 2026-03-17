import { isSauceLabs } from './sauce.js'

/**
 * Handles the native notification permission dialog that appears when the app requests
 * notification access (e.g. after tapping "Continue" on the Notifications onboarding screen).
 * Safe to call even when no dialog is present (e.g. already granted).
 *
 * iOS: "Allow [App] to send you notifications?" with "Don't Allow" and "Allow"
 * Android 13+: Runtime permission dialog with "Don't allow" and "Allow"
 *
 * Skipped on Sauce Labs — system dialogs may not appear reliably on their real-device cloud.
 */
export async function acceptNotificationPermissionIfPresent(): Promise<void> {
  if (isSauceLabs()) return

  // Give the permission dialog time to appear (shows shortly after the app requests it)
  await new Promise((r) => setTimeout(r, 1_500))

  if (driver.isIOS) {
    await acceptIosNotificationPermission()
  } else if (driver.isAndroid) {
    await acceptAndroidNotificationPermission()
  }
}

async function acceptIosNotificationPermission(): Promise<void> {
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

async function acceptAndroidNotificationPermission(): Promise<void> {
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
