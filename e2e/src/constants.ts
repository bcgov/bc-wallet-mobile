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

export const TestUsers = {
  photo: {
    username: 'e2e_shaggy',
    cardSerial: 'C74455103',
    dob: '19690913',
    documentNumber: 'WG12345678',
  },
  combined: {
    username: 'e2e_velma',
    cardSerial: 'C82643367',
    dob: '19951217',
    documentNumber: 'WG12345678',
  },
  nonPhoto: {
    username: 'e2e_daphne',
    cardSerial: 'C26444539',
    dob: '19800922',
    documentNumber: 'WG12345678',
  },
  na: {
    username: 'e2e_fred',
    cardSerial: 'N/A',
    dob: '19680918',
    documentNumber: 'WG12345678',
  },
}
