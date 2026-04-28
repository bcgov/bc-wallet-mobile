// local/wdio.ios.local.device.migration.conf.ts — iOS real device migration (v3 → v4)
/**
 * Starts with the v3 BC Services Card IPA on a USB-connected iOS device.
 * The migration suite installs the v4 IPA mid-test via `driver.installApp()`.
 *
 * Required env vars / defaults:
 *   V3_IOS_APP      — filename of v3 IPA in e2e/apps/ (default: BCSC-v3.ipa)
 *
 * Example:
 *   V3_IOS_APP=BCSC-v3.ipa \
 *     yarn wdio configs/local/wdio.ios.local.device.migration.conf.ts --suite migration
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE || 'iPhone',
    'appium:platformVersion': process.env.IOS_VERSION || '',
    'appium:udid': process.env.IOS_UDID || '',
    'appium:automationName': 'XCUITest',
    'appium:app': resolve(__dirname, '../../apps', process.env.V3_IOS_APP || 'BCSC-v3.ipa'),
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoAcceptAlerts': false,
    'appium:xcodeOrgId': process.env.XCODE_ORG_ID || '',
    'appium:xcodeSigningId': process.env.XCODE_SIGNING_ID || 'Apple Development',
    'appium:showXcodeLog': process.env.SHOW_XCODE_LOG === 'true',
  },
]

export { config }
