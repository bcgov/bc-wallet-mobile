import { isSauceLabs } from './sauce.js'

/**
 * Handles the native iOS "Allow BC Wallet to find devices on local networks?" permission dialog
 * that appears on first install. Safe to call even when no dialog is present (e.g. already granted).
 * Skipped on Sauce Labs — the modal does not appear on their real-device cloud.
 * Skipped on iOS Simulator — the dialog does not appear on emulated devices.
 */
function isIosSimulator(): boolean {
  const caps = driver.capabilities as Record<string, unknown>
  const orgId = caps?.['appium:xcodeOrgId'] ?? caps?.['xcodeOrgId']
  return !orgId || String(orgId).trim() === ''
}

export async function acceptLocalNetworkPermissionIfPresent(): Promise<void> {
  if (!driver.isIOS) return
  if (isSauceLabs()) return
  if (isIosSimulator()) return

  // Give the permission dialog time to appear (often shows 1–2s after launch)
  await new Promise((r) => setTimeout(r, 2_000))

  const maxAttempts = 5
  const intervalMs = 1_000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Try mobile: alert first — works for in-app alerts and some system dialogs
      await driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Allow' })
      return
    } catch {
      // Fallback: system dialogs (e.g. local network) are managed by com.apple.springboard.
      // Switch context to interact with them, then restore.
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
