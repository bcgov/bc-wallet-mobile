export const Timeouts = {
  /** Default wait for an element to appear on screen */
  elementVisible: 15_000,
  /** Wait for a screen transition to complete */
  screenTransition: 20_000,
  /** Initial app launch — generous for cold starts on real devices */
  appLaunch: 30_000,
  /** Per-test timeout (Mocha) */
  testTimeout: 300_000,
  /** WDIO waitforTimeout */
  waitFor: 20_000,
  /** Appium new command timeout */
  newCommand: 180,
  /** WDIO connection retry timeout */
  connectionRetry: 180_000,
} as const
