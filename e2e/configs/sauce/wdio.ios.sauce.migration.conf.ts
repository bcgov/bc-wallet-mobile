// sauce/wdio.ios.sauce.migration.conf.ts
/**
 * SauceLabs iOS config for migration tests (v3 → v4).
 *
 * Starts with the v3 BC Services Card iOS app. The migration suite installs the
 * v4 app over it mid-test using `driver.installApp()`.
 *
 * Key differences from the standard iOS sauce config:
 * - `appium:app` points to the v3 app (V3_IOS_APP_FILENAME)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 * - Image injection enabled (needed for any camera flows in v3)
 */
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const v3AppFilename = process.env.V3_IOS_APP_FILENAME || 'BCSC-v3-latest.ipa'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': 'iPhone.*',
    'appium:automationName': 'XCUITest',
    'appium:app': `storage:filename=${v3AppFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': false,
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || 'Migration v3→v4 (iOS)',
      // Allow app install during test
      resigningEnabled: true,
    },
  },
]

export { config }
