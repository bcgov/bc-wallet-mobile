import logger from '@wdio/logger'

const POLL_INTERVAL_MS = 500
const DEFAULT_APPEAR_TIMEOUT_MS = 5_000
const DEFAULT_DISMISS_TIMEOUT_MS = 3_000

// 'Open' accepts the iOS "Open in <app>?" confirmation raised when a deep link resolves to the app.
const IOS_APPROVE_ALERT_BUTTON_LABELS = ['Allow', 'Allow While Using App', 'Allow Once', 'OK', 'Trust', 'Continue', 'Open']
// iOS renders the apostrophe in "Don't Allow" as U+2019 — matching only the straight form let the deny
// fall through to the label-blind dismiss fallback. Both are listed; the rendered form is OS-dependent.
const IOS_DECLINE_ALERT_BUTTON_LABELS = ["Don't Allow", 'Don\u2019t Allow', 'Deny', 'Cancel', 'Not Now']

const ANDROID_PERM_ALLOW_REGEX = '.*:id/permission_allow.*'
const ANDROID_PERM_DENY_REGEX = '.*:id/permission_deny.*'
const ANDROID_PERM_ANY_REGEX = '.*:id/permission_(allow|deny).*'
const ANDROID_RESET_APP_SELECTOR = 'android=new UiSelector().textMatches("(?i)^reset app$")'
const ANDROID_ALERT_OK_SELECTOR = 'android=new UiSelector().textMatches("(?i)^ok$")'

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

type AlertStrategy = { name: string; run: () => Promise<boolean | void> }

function buildIosAlertStrategies(action: 'accept' | 'dismiss'): AlertStrategy[] {
  const labels = action === 'accept' ? IOS_APPROVE_ALERT_BUTTON_LABELS : IOS_DECLINE_ALERT_BUTTON_LABELS
  const driverFallback = action === 'accept' ? () => driver.acceptAlert() : () => driver.dismissAlert()

  return [
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
}

async function tryAlertStrategy({ name, run }: AlertStrategy): Promise<boolean> {
  try {
    const result = await run()
    if (result === false) return false
  } catch (err) {
    console.log(`[alerts] ${name} threw: ${(err as Error).message ?? err}`)
    return false
  }
  if (await waitForDismissal(DEFAULT_DISMISS_TIMEOUT_MS)) {
    console.log(`[alerts] Resolved system alert via ${name}`)
    return true
  }
  console.log(`[alerts] ${name} did not dismiss the alert — trying next strategy`)
  return false
}

async function resolveIosSystemAlert(action: 'accept' | 'dismiss', appearTimeoutMs: number): Promise<void> {
  if (!(await waitForPopup(appearTimeoutMs))) {
    console.log(`[alerts] No iOS native popup appeared within ${appearTimeoutMs}ms — continuing`)
    return
  }

  for (const strategy of buildIosAlertStrategies(action)) {
    if (await tryAlertStrategy(strategy)) return
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
 * Wait for a screen to become ready, accepting any native permission dialog that shows up along the
 * way — however late, and however many times.
 *
 * `acceptSystemAlert` alone races the app on camera screens: it polls a fixed window and gives up
 * silently, but the OS permission controller can take longer than that to appear after a heavy camera
 * screen mounts, and the screen re-renders its whole tree around the request (loading → permission
 * fallback → camera). Interleaving the two checks removes the race in both directions — a dialog that
 * arrives late still gets accepted, and a permission that was already granted costs nothing because
 * `isReady` simply passes on the first poll.
 *
 * @param isReady - cheap, non-throwing probe for "the screen we want is on display"
 * @returns true once `isReady` passes; false if the timeout elapsed first (caller reports the context)
 */
export async function acceptSystemAlertsUntil(
  isReady: () => Promise<boolean>,
  { timeoutMs = 30_000, pollMs = 500 }: { timeoutMs?: number; pollMs?: number } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (await hasNativePopup()) {
      // Short appear-timeout: we already know a popup is up, so this goes straight to accepting it.
      await acceptSystemAlert(1_000).catch((err) => {
        console.log(`[alerts] Failed to accept popup while waiting for screen: ${(err as Error).message ?? err}`)
      })
    } else if (await isReady()) {
      return true
    }
    if (Date.now() > deadline) return false
    await driver.pause(pollMs)
  }
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

/**
 * Tap a NAMED button on an app-owned `Alert.alert` — the verify flow's two-action confirmations, where
 * cancel and confirm must be told apart. `acceptSystemAlert`/`acceptAppAlert` cannot: they take whichever
 * button the platform calls the accept action, which for such a pair is the choice under test.
 *
 * iOS uses WDA's `buttonLabel` (it reaches alerts presented over a modal, as the help menu's are), then
 * falls back to a direct tap. Android matches the visible label case-insensitively — AppCompat may
 * upper-case it.
 */
export async function tapAlertButton(label: string, appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) {
    // The popup probes above only know the OS permission controller, so an app dialog is waited on
    // through the button itself; the reverse wait is what proves the tap landed.
    const escaped = label.replaceAll(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`)
    const button = $(`android=new UiSelector().textMatches("(?i)^${escaped}$")`)
    await button.waitForDisplayed({ timeout: appearTimeoutMs })
    await button.click()
    await button.waitForDisplayed({ timeout: DEFAULT_DISMISS_TIMEOUT_MS, reverse: true })
    console.log(`[alerts] Tapped "${label}" on the app alert`)
    return
  }

  if (!(await waitForPopup(appearTimeoutMs))) {
    throw new Error(`[alerts] No alert appeared within ${appearTimeoutMs}ms to tap "${label}" on`)
  }
  // WDA's accept-by-name taps whichever button it is given, whatever role it plays — cancel included.
  const tappedByLabel = await quietly(() =>
    driver
      .execute('mobile: alert', { action: 'accept', buttonLabel: label })
      .then(() => true)
      .catch(() => false)
  )
  if (!tappedByLabel && !(await tapIosButtonInsideAlert([label]))) {
    throw new Error(`[alerts] Alert is showing but has no button labelled "${label}"`)
  }
  if (!(await waitForDismissal(DEFAULT_DISMISS_TIMEOUT_MS))) {
    throw new Error(`[alerts] Tapped "${label}" but the alert did not dismiss`)
  }
  console.log(`[alerts] Tapped "${label}" on the app alert`)
}

/**
 * Accept an app-owned confirmation/success `Alert.alert` by tapping its OK button — e.g. the
 * forget-pairings "Success — device unpaired" dialog.
 *
 * This is NOT a system permission dialog: on Android `acceptSystemAlert` only matches the OS
 * permission controller's `permission_allow*` resourceIds, so it never dismisses this one. Mirror
 * `tapResetAppConfirm` and match the button's visible label instead (RN `Alert.alert` renders a
 * native AppCompat AlertDialog whose OK button carries no testID). iOS renders the same alert as a
 * UIAlertController, which the system-alert accept path already handles.
 */
export async function acceptAppAlert(appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) {
    const btn = $(ANDROID_ALERT_OK_SELECTOR)
    await btn.waitForDisplayed({ timeout: appearTimeoutMs })
    await btn.click()
    return
  }
  await acceptSystemAlert(appearTimeoutMs)
}
