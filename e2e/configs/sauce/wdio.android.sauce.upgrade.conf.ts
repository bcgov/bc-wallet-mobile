// sauce/wdio.android.sauce.upgrade.conf.ts
/**
 * SauceLabs Android config for upgrade tests (previous release → current).
 *
 * Starts with the previous released Android build (PREV_ANDROID_APP — default `BCSC-prev.apk`,
 * the rolling Sauce storage name refreshed by the publish/refresh workflows). The upgrade suite
 * installs the current build over it mid-test using `driver.installApp()`.
 *
 * versionCode = build run number, so the previous build must be an OLDER run number than the
 * current one — Android refuses downgrade installs.
 *
 * Key differences from the standard Android sauce config:
 * - `appium:app` points to the previous release (PREV_ANDROID_APP)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 */
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const prevAppFilename = process.env.PREV_ANDROID_APP || 'BCSC-prev.apk'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Google.*',
    'appium:automationName': 'UiAutomator2',
    'appium:app': `storage:filename=${prevAppFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': false,
    ...(process.env.ANDROID_PLATFORM_VERSION && {
      'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION,
    }),
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || 'Upgrade from previous release (Android)',
    },
  },
]

export { config }
