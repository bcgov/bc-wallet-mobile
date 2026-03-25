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
  return typeof orgId !== 'string' || orgId.trim() === ''
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** In-app / standard alert API — works for some system dialogs. */
async function tryDismissAllowViaMobileAlert(): Promise<boolean> {
  try {
    await driver.execute('mobile: alert', { action: 'accept', buttonLabel: 'Allow' })
    return true
  } catch {
    return false
  }
}

/** Local-network style prompts under Springboard — switch app context, tap Allow, restore. */
async function tryDismissAllowViaSpringboard(): Promise<boolean> {
  try {
    await driver.updateSettings({ defaultActiveApplication: 'com.apple.springboard' })
    const allowButton = await $('~Allow')
    if (!(await allowButton.isDisplayed())) return false
    await allowButton.click()
    return true
  } catch {
    return false
  } finally {
    await driver.updateSettings({ defaultActiveApplication: 'auto' })
  }
}

export async function acceptLocalNetworkPermissionIfPresent(): Promise<void> {
  if (!driver.isIOS) return
  if (isSauceLabs()) return
  if (isIosSimulator()) return

  // Give the permission dialog time to appear (often shows 1–2s after launch)
  await delay(2_000)

  const maxAttempts = 5
  const intervalMs = 1_000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await tryDismissAllowViaMobileAlert()) return
    if (await tryDismissAllowViaSpringboard()) return
    if (attempt < maxAttempts - 1) await delay(intervalMs)
  }
}
