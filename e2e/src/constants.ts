export const Timeouts = {
  /** Default wait for an element to appear on screen */
  elementVisible: 5_000,
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
  /** swipe duration */
  swipeDuration: 800,
} as const

export const TestUsers = {
  photo: {
    username: 'e2e_shaggy',
    cardSerial: 'C74455103',
    dob: '19690913',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_shaggy.jpg',
  },
  combined: {
    username: 'e2e_velma',
    cardSerial: 'C82643367',
    dob: '19951217',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_velma.jpg',
  },
  nonPhoto: {
    username: 'e2e_daphne',
    cardSerial: 'C26444539',
    dob: '19800922',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_daphne.jpg',
  },
  na: {
    username: 'e2e_fred',
    cardSerial: 'N/A',
    dob: '19680918',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_fred.jpg',
  },
}

export type TestUser = (typeof TestUsers)[keyof typeof TestUsers]

/**
 * Window-relative tap for camera tap-to-focus after Sauce image injection (0–1).
 * Slightly above center matches where the card often sits in the preview; adjust if needed.
 */
export const SCAN_SERIAL_TAP_FOCUS_WINDOW = { x: 0.5, y: 0.45 } as const
