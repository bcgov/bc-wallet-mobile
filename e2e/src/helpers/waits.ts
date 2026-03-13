/**
 * Wait for a specific screen (by ScreenMarker value) to appear.
 * Retries every intervalMs up to timeoutMs.
 */
export async function waitForScreen(expectedScreen: string, timeoutMs = 15_000, intervalMs = 1_000): Promise<void> {
  await browser.waitUntil(
    async () => {
      const marker = await $('~ScreenMarker')
      if (!(await marker.isExisting())) return false
      const name = driver.isIOS ? await marker.getAttribute('label') : await marker.getAttribute('content-desc')
      return name === expectedScreen
    },
    { timeout: timeoutMs, interval: intervalMs, timeoutMsg: `Screen "${expectedScreen}" did not appear` }
  )
}
