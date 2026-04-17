import logger from '@wdio/logger'

const POLL_INTERVAL_MS = 500
const DEFAULT_APPEAR_TIMEOUT_MS = 5_000
const DEFAULT_DISMISS_TIMEOUT_MS = 3_000

const IOS_APPROVE_ALERT_BUTTON_LABELS = ['Allow', 'Allow While Using App', 'Allow Once', 'OK', 'Trust', 'Continue']

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

async function getAlertButtons(): Promise<string[] | null> {
  try {
    const buttons = await quietly(() => driver.execute('mobile: alert', { action: 'getButtons' }))
    return Array.isArray(buttons) && buttons.length > 0 ? (buttons as string[]) : null
  } catch {
    return null
  }
}

async function hasNativePopup(): Promise<boolean> {
  // Silent probe first: the app snapshot sometimes includes SpringBoard alerts.
  const alert = $('-ios class chain:**/XCUIElementTypeAlert')
  if (await alert.isDisplayed().catch(() => false)) return true

  // Authoritative fallback: `mobile: alert getButtons` reaches SpringBoard via
  // WDA. Wrapped in `quietly` because it logs WebDriverError when no alert is
  // open, which floods test output during polling.
  return (await getAlertButtons()) !== null
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

async function tapApproveButtonInsideAlert(): Promise<boolean> {
  for (const label of IOS_APPROVE_ALERT_BUTTON_LABELS) {
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

async function acceptViaButtonLabel(buttons: string[]): Promise<boolean> {
  const match = IOS_APPROVE_ALERT_BUTTON_LABELS.find((label) => buttons.includes(label))
  if (!match) {
    console.log(`[alerts] Alert buttons ${JSON.stringify(buttons)} had no known approve label`)
    return false
  }
  await quietly(() => driver.execute('mobile: alert', { action: 'accept', buttonLabel: match }))
  console.log(`[alerts] Accepted via mobile: alert buttonLabel="${match}"`)
  return true
}

/**
 * Accept an iOS system alert (e.g. notification/camera permission dialogs).
 *
 * SpringBoard permission dialogs live outside the app's UI snapshot on newer
 * iOS versions, so standard XPath/class-chain queries miss them. We detect
 * them via `mobile: alert getButtons` (a WDA endpoint that reaches SpringBoard
 * directly) and accept by label for reliability.
 *
 * On Android this is a no-op — use `appium:autoGrantPermissions` there.
 */
export async function acceptSystemAlert(appearTimeoutMs = DEFAULT_APPEAR_TIMEOUT_MS): Promise<void> {
  if (driver.isAndroid) return

  if (!(await waitForPopup(appearTimeoutMs))) {
    console.log(`[alerts] No native popup appeared within ${appearTimeoutMs}ms — continuing`)
    return
  }

  const strategies: Array<{ name: string; run: () => Promise<boolean | void> }> = [
    {
      name: 'mobile: alert + buttonLabel',
      run: async () => {
        const buttons = await getAlertButtons()
        if (!buttons) throw new Error('getButtons returned no buttons')
        return acceptViaButtonLabel(buttons)
      },
    },
    { name: 'mobile: alert accept', run: () => quietly(() => driver.execute('mobile: alert', { action: 'accept' })) },
    { name: 'driver.acceptAlert()', run: () => quietly(() => driver.acceptAlert()) },
    {
      name: 'button tap inside alert',
      run: async () => {
        const tapped = await tapApproveButtonInsideAlert()
        if (!tapped) throw new Error('no approve button found inside alert')
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
      console.log(`[alerts] Accepted system alert via ${name}`)
      return
    }
    console.log(`[alerts] ${name} did not dismiss the alert — trying next strategy`)
  }

  throw new Error('[alerts] Detected native popup but failed to dismiss it with any strategy')
}
