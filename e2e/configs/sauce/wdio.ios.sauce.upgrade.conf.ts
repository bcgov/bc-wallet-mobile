// sauce/wdio.ios.sauce.upgrade.conf.ts
/**
 * SauceLabs iOS config for the upgrade suites (a shipped version → the current build).
 *
 * Starts with the shipped iOS build `PREV_VERSION` names — `BCSC-v<version>.ipa` in Sauce storage,
 * kept there by the publish + refresh workflows for every version in e2e/upgrade-sources.json
 * (`PREV_IOS_APP` overrides the file: any older build still in storage). The upgrade suites install
 * the current build over it mid-test using `driver.installApp()`.
 *
 * Mid-test installs use the storage-based `mobile: installApp`, which passes through Sauce
 * resigning on public RDC (validated 2026-08-25, 7/7). A local real-device alternative remains:
 * configs/local/wdio.ios.local.device.upgrade.conf.ts.
 *
 * Key differences from the standard iOS sauce config:
 * - `appium:app` points to the previous build (PREV_VERSION / PREV_IOS_APP)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 */
import { resolvePrevApp } from '../../src/flows/prev-build/sources.js'
import { IOS_TIME_ZONE_CAPS } from '../wdio.shared.conf.js'
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const prev = resolvePrevApp('ios')

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone.*',
    'appium:automationName': 'XCUITest',
    ...IOS_TIME_ZONE_CAPS,
    'appium:app': `storage:filename=${prev.app}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': false,
    ...(process.env.IOS_PLATFORM_VERSION && {
      'appium:platformVersion': process.env.IOS_PLATFORM_VERSION,
    }),
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || `Upgrade from ${prev.version} (iOS)`,
      // Allow app install during test
      resigningEnabled: true,
    },
  },
]

export { config }
