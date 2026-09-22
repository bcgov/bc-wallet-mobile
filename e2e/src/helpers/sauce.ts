export function isSauceLabs(): boolean {
  const hostname = String(browser.options?.hostname ?? '')
  const normalizedHostname = hostname.trim().toLowerCase()
  if (normalizedHostname === 'saucelabs.com' || normalizedHostname.endsWith('.saucelabs.com')) {
    return true
  }
  const opts = browser.options as { user?: string; key?: string } | undefined
  return Boolean(opts?.user && opts?.key)
}

export async function annotate(message: string) {
  if (isSauceLabs()) {
    await browser.execute(`sauce:context=${message}`)
  }
}

/**
 * Whether THIS session asked Sauce for a locked device WITH biometric interception — the device-auth
 * lane. Read off the requested `sauce:options`, so a journey that needs the lane can skip instead of
 * failing on a missing option when it is run anywhere else.
 */
export function isDeviceSecurityLane(): boolean {
  if (!isSauceLabs()) return false
  const options = (driver.requestedCapabilities as Record<string, unknown>)['sauce:options'] as
    | { setupDeviceLock?: boolean; biometricsInterception?: boolean }
    | undefined
  return options?.setupDeviceLock === true && options?.biometricsInterception === true
}
