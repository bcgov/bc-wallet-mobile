// sauce/wdio.ios.sauce.upgrade.conf.ts
/**
 * SauceLabs iOS config for upgrade tests (previous release → current).
 *
 * Starts with the previous released iOS build (PREV_IOS_APP — default `BCSC-prev.ipa`, the
 * rolling Sauce storage name refreshed by the publish/refresh workflows). The upgrade suite
 * installs the current build over it mid-test using `driver.installApp()`.
 *
 * The suite runtime-skips on Sauce public RDC (mid-test installApp bypasses Sauce resigning) —
 * this config exists for completeness/private devices; the run reports green via the skip.
 * Run the iOS upgrade locally instead: configs/local/wdio.ios.local.device.upgrade.conf.ts.
 *
 * Key differences from the standard iOS sauce config:
 * - `appium:app` points to the previous release (PREV_IOS_APP)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 */
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const prevAppFilename = process.env.PREV_IOS_APP || 'BCSC-prev.ipa'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone.*',
    'appium:automationName': 'XCUITest',
    'appium:app': `storage:filename=${prevAppFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': false,
    ...(process.env.IOS_PLATFORM_VERSION && {
      'appium:platformVersion': process.env.IOS_PLATFORM_VERSION,
    }),
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || 'Upgrade from previous release (iOS)',
      // Allow app install during test
      resigningEnabled: true,
    },
  },
]

export { config }
