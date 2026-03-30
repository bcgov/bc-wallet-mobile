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
