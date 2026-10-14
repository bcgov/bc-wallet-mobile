/**
 * Appium idles a session out at `newCommandTimeout` (180 s) and Sauce after 90 s without a command;
 * a cheap command this often keeps it alive through Node-only work.
 */
const KEEPALIVE_INTERVAL_MS = 45_000

/**
 * Run Node-side work — an IDCheck round trip, an issuer-side poll — without the WebDriver session
 * idling out underneath it (measured: a wallet journey lost its session inside a 90 s issuer wait).
 * A no-op outside a wdio session, so the CLI scripts share the callers.
 */
export async function withDriverKeepalive<T>(work: () => Promise<T>): Promise<T> {
  if (typeof driver === 'undefined') return work()
  const timer = setInterval(() => {
    driver.getWindowSize().catch(() => undefined)
  }, KEEPALIVE_INTERVAL_MS)
  try {
    return await work()
  } finally {
    clearInterval(timer)
  }
}
