import logger from '@wdio/logger'

const POLL_INTERVAL_MS = 500
const DEFAULT_APPEAR_TIMEOUT_MS = 5_000
const DEFAULT_DISMISS_TIMEOUT_MS = 3_000

const IOS_APPROVE_ALERT_BUTTON_LABELS = ['Allow', 'Allow While Using App', 'Allow Once', 'OK', 'Trust', 'Continue']
const IOS_DECLINE_ALERT_BUTTON_LABELS = ["Don't Allow", 'Deny', 'Cancel', 'Not Now']

const ANDROID_PERM_ALLOW_REGEX = '.*:id/permission_allow.*'
const ANDROID_PERM_DENY_REGEX = '.*:id/permission_deny.*'
const ANDROID_PERM_ANY_REGEX = '.*:id/permission_(allow|deny).*'
const ANDROID_RESET_APP_SELECTOR = 'android=new UiSelector().textMatches("(?i)^reset app$")'

const webdriverLogger = logger('webdriver')

function escapeIosSelectorValue(value: string): string {
  const bs = String.fromCodePoint(0x5c)
  const dq = String.fromCodePoint(0x22)
  return value.replaceAll(bs, `${bs}${bs}`).replaceAll(dq, `${bs}${dq}`)
}

async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  const previous = webdriverLogger.getLevel()
  webdriverLogger.setLevel('silent')
  try {
    return await fn()
  } finally {
    webdriverLogger.setLevel(previous)
  }
}

async function getIosAlertButtons(): Promise<string[] | null> {
  try {
    const buttons = await quietly(() => driver.execute('mobile: alert', { action: 'getButtons' }))
    return Array.isArray(buttons) && buttons.length > 0 ? (buttons as string[]) : null
  } catch {
    return null
  }
}

async function hasIosNativePopup(): Promise<boolean> {
  const alert = $('-ios class chain:**/XCUIElementTypeAlert')
  if (await alert.isDisplayed().catch(() => false)) return true
  // `mobile: alert getButtons` reaches SpringBoard via WDA when the snapshot
  // misses it. Wrapped in `quietly` because it logs WebDriverError when no
  // alert is open, which floods test output during polling.
  return (await getIosAlertButtons()) !== null
}

async function hasAndroidPermissionDialog(): Promise<boolean> {
  const btn = $(`android=new UiSelector().resourceIdMatches("${ANDROID_PERM_ANY_REGEX}")`)
  return btn.isDisplayed().catch(() => false)
}

async function hasNativePopup(): Promise<boolean> {
  return driver.isAndroid ? hasAndroidPermissionDialog() : hasIosNativePopup()
}

async function waitForPopup(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await hasNativePopup()) return true
    await driver.pause(POLL_INTERVAL_MS)
  }
  return false
}

async function waitForDismissal(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await hasNativePopup())) return true
    await driver.pause(POLL_INTERVAL_MS)
  }
  return false
}

async function tapIosButtonInsideAlert(labels: readonly string[]): Promise<boolean> {
  for (const label of labels) {
    const escaped = escapeIosSelectorValue(label)
    const button = $(
      `-ios class chain:**/XCUIElementTypeAlert/**/XCUIElementTypeButton[\`label == "${escaped}" OR name == "${escaped}"\`]`
    )
    if (await button.isDisplayed().catch(() => false)) {
      await button.click()
      console.log(`[alerts] Tapped "${label}" button inside alert`)
      return true
    }
  }
  return false
}

async function actOnIosAlertByLabel(
  buttons: string[],
  labels: readonly string[],
  action: 'accept' | 'dismiss'
): Promise<boolean> {
  const match = labels.find((label) => buttons.includes(label))
  if (!match) {
    console.log(`[alerts] Alert buttons ${JSON.stringify(buttons)} had no known ${action} label`)
    return false
  }
  await quietly(() => driver.execute('mobile: alert', { action, buttonLabel: match }))
  console.log(`[alerts] ${action === 'accept' ? 'Accepted' : 'Dismissed'} via mobile: alert buttonLabel="${match}"`)
  return true
}

async function resolveIosSystemAlert(action: 'accept' | 'dismiss', appearTimeoutMs: number): Promise<void> {
  if (!(await waitForPopup(appearTimeoutMs))) {
    console.log(`[alerts] No iOS native popup appeared within ${appearTimeoutMs}ms — continuing`)
    return
  }

  const labels = action === 'accept' ? IOS_APPROVE_ALERT_BUTTON_LABELS : IOS_DECLINE_ALERT_BUTTON_LABELS
  const driverFallback = action === 'accept' ? () => driver.acceptAlert() : () => driver.dismissAlert()

  const strategies: Array<{ name: string; run: () => Promise<boolean | void> }> = [
    {
      name: `mobile: alert + buttonLabel (${action})`,
      run: async () => {
        const buttons = await getIosAlertButtons()
        if (!buttons) throw new Error('getButtons returned no buttons')
        return actOnIosAlertByLabel(buttons, labels, action)
      },
    },
    { name: `mobile: alert ${action}`, run: () => quietly(() => driver.execute('mobile: alert', { action })) },
    { name: `driver.${action}Alert()`, run: () => quietly(driverFallback) },
    {
      name: 'button tap inside alert',
      run: async () => {
        const tapped = await tapIosButtonInsideAlert(labels)
        if (!tapped) throw new Error(`no ${action} button found inside alert`)
      },
    },
  ]

  for (const { name, run } of strategies) {
    try {
      const result = await run()
      if (result === false) continue
    } catch (err) {
      console.log(`[alerts] ${name} threw: ${(err as Error).message ?? err}`)
      continue
    }
    if (await waitForDismissal(DEFAULT_DISMISS_TIMEOUT_MS)) {
      console.log(`[alerts] Resolved system alert via ${name}`)
      return
    }
    console.log(`[alerts] ${name} did not dismiss the alert — trying next strategy`)
  }

  throw new Error(`[alerts] Detected native popup but failed to ${action} it with any strategy`)
}

async function resolveAndroidPermissionDialog(action: 'accept' | 'dismiss', appearTimeoutMs: number): Promise<void> {
  if (!(await waitForPopup(appearTimeoutMs))) {
    console.log(`[alerts] No Android permission dialog appeared within ${appearTimeoutMs}ms — continuing`)
    return
  }

  const resourceIdRegex = action === 'accept' ? ANDROID_PERM_ALLOW_REGEX : ANDROID_PERM_DENY_REGEX
  const btn = $(`android=new UiSelector().resourceIdMatches("${resourceIdRegex}")`)
  if (!(await btn.isDisplayed().catch(() => false))) {
    throw new Error(`[alerts] Permission dialog detected but no ${action} button matched ${resourceIdRegex}`)
  }
  await btn.click()

  if (await waitForDismissal(DEFAULT_DISMISS_TIMEOUT_MS)) {
    console.log(`[alerts] ${action === 'accept' ? 'Accepted' : 'Dismissed'} Android permission dialog`)
    return
  }
  throw new Error(`[alerts] Tapped ${action} button but Android permission dialog did not dismiss`)
}

/**
 * Accept a native system alert (e.g. notification / camera permission dialogs).
 *
 * iOS: SpringBoard permission dialogs live outside the app snapshot on newer
 * iOS versions, so we detect them via `mobile: alert getButtons` (WDA reaches
 * SpringBoard directly) and accept by label for reliability.
 *
 * Android: the system permission controller renders the dialog with stable
 * `permission_allow*` resourceIds — we match those with a regex to cover
 * "Allow", "While using the app", "Only this time" across OS versions.
 */
export async function acceptSystemAlert(appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) {
    await resolveAndroidPermissionDialog('accept', appearTimeoutMs)
    return
  }
  await resolveIosSystemAlert('accept', appearTimeoutMs)
}

/**
 * Dismiss/deny a native system alert — the negative counterpart of
 * `acceptSystemAlert`. Used to exercise declined-permission codepaths.
 */
export async function dismissSystemAlert(appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) {
    await resolveAndroidPermissionDialog('dismiss', appearTimeoutMs)
    return
  }
  await resolveIosSystemAlert('dismiss', appearTimeoutMs)
}

/**
 * Confirm the destructive "Reset App" action on the in-app RN `Alert.alert`
 * that fires from `useAlerts.CancelMobileCardSetup`.
 *
 * This is an app-owned dialog (iOS: UIAlertController, Android: Material
 * AlertDialog), not a system permission dialog — so it's handled separately
 * from `acceptSystemAlert`.
 */
export async function tapResetAppConfirm(appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) {
    const btn = $(ANDROID_RESET_APP_SELECTOR)
    await btn.waitForDisplayed({ timeout: appearTimeoutMs })
    await btn.click()
    return
  }
  // iOS: `acceptAlert` taps the non-cancel action, which is Reset App given
  // the action order in SettingsContent.tsx `onPressRemoveAccount`. The
  // try/catch handles configs with autoAcceptAlerts enabled (e.g. the
  // migration device config), where the dialog may already be gone.
  await driver.pause(2000)
  try {
    await driver.acceptAlert()
  } catch {
    // autoAcceptAlerts already handled it
  }
}
