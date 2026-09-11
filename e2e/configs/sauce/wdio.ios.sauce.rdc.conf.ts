// sauce/wdio.ios.sauce.rdc.conf.ts
import { ANDROID_ONLY_SPECS, DEVICE_AUTH_SPECS, NON_DEVICE_AUTH_SPECS } from '../wdio.shared.conf.js'
import { DEVICE_SECURITY_LANE, config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.IOS_APP_FILENAME || 'BCSC-Dev-latest.ipa'

const config = { ...sauceConfig }

// Dropped before scheduling, so `--suite regression` costs no iOS session on them. Appended: the
// shared conf may already exclude the send-video journeys (E2E_EXCLUDE_SEND_VIDEO).
config.exclude = [...(config.exclude ?? []), ...ANDROID_ONLY_SPECS]

const iosCaps = {
  platformName: 'iOS',
  'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone.*',
  'appium:automationName': 'XCUITest',
  'appium:app': `storage:filename=${appFilename}`,
  'appium:noReset': false,
  'appium:fullReset': true,
  'appium:newCommandTimeout': 180,
  'appium:autoAcceptAlerts': false,
  ...(process.env.IOS_PLATFORM_VERSION && {
    'appium:platformVersion': process.env.IOS_PLATFORM_VERSION,
  }),
}

// Pin the OFFICIAL Appium WebDriverAgent (appium3-2026-01+). The shared default `latest` uses Sauce's
// CUSTOM WDA, whose iOS deep-link open is broken: `mobile: deepLink` with a bundleId throws "The
// current Xcode SDK does not support opening of URLs with given application", and without a bundleId
// it falls back to Siri. The official WDA implements the real open. Override via env if it ages out.
const iosSauceOptions = {
  ...sauceRdcOptions,
  appiumVersion: process.env.SAUCE_APPIUM_VERSION || 'appium3-2026-07',
}

/**
 * Two capability lanes: the default session, and the device-authentication lane — the same session
 * plus a real screen lock and biometric interception, for the device-auth journeys ALONE (a locked
 * device changes the state every other journey starts from). The exclude lists are complementary, so
 * `--suite device-auth` schedules only the second lane and a regular suite never inherits the lock.
 */
config.capabilities = [
  { ...iosCaps, 'wdio:exclude': DEVICE_AUTH_SPECS, 'sauce:options': iosSauceOptions },
  {
    ...iosCaps,
    'wdio:exclude': NON_DEVICE_AUTH_SPECS,
    'sauce:options': { ...iosSauceOptions, ...DEVICE_SECURITY_LANE },
  },
]

export { config }
