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
 * Derive a human-readable job name from the spec file path.
 * e.g. "full-regression/biometrics.spec.ts" -> "Full Regression / Biometrics"
 */
export function jobNameFromSpec(specPath: string): string {
  const match = specPath.match(/test\/[^/]+\/(.+)\.spec\.\w+$/)
  if (!match)
    return (
      specPath
        .split('/')
        .pop()
        ?.replace(/\.spec\.\w+$/, '') ?? 'E2E Test'
    )

  return match[1]
    .split('/')
    .map((segment) => segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' / ')
}
