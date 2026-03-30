import { isSauceLabs } from './sauce.js'

function getSessionCapabilities(): Record<string, unknown> {
  const d = driver.capabilities as Record<string, unknown>
  const b = (browser.capabilities ?? {}) as Record<string, unknown>
  return { ...b, ...d }
}

/**
 * True when the session targets an iOS Simulator (not a physical device).
 *
 * - Prefer Appium's `realDevice` when present (some stacks omit it on USB sessions).
 * - Otherwise use this repo's convention: `wdio.ios.local.device` sets
 *   `appium:xcodeOrgId` for WDA signing; `wdio.ios.local.sim` does not.
 */
export function isIosSimulatorSession(): boolean {
  const caps = getSessionCapabilities()
  if (caps['realDevice'] === true || caps['appium:realDevice'] === true) {
    return false
  }
  const orgId = caps['appium:xcodeOrgId'] ?? caps['xcodeOrgId']
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
  if (isIosSimulatorSession()) return

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
