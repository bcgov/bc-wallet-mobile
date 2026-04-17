// sauce/wdio.android.sauce.migration.conf.ts
/**
 * SauceLabs Android config for migration tests (v3 → v4).
 *
 * Starts with the v3 BC Services Card Android app. The migration suite installs
 * the v4 app over it mid-test using `driver.installApp()`.
 *
 * Key differences from the standard Android sauce config:
 * - `appium:app` points to the v3 app (V3_ANDROID_APP_FILENAME)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 * - Image injection enabled (needed for any camera flows in v3)
 */
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const v3AppFilename = process.env.V3_ANDROID_APP_FILENAME || 'BCSC-v3-latest.apk'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': 'Google.*',
    'appium:automationName': 'UiAutomator2',
    'appium:app': `storage:filename=${v3AppFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': true,
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || 'Migration v3→v4 (Android)',
    },
  },
]

export { config }
