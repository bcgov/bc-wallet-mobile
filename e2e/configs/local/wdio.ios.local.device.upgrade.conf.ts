// local/wdio.ios.local.device.upgrade.conf.ts — iOS real device upgrade (previous release → current)
/**
 * Starts with the previous released IPA on a USB-connected iOS device.
 * The upgrade suite installs the current IPA mid-test via `driver.installApp()`.
 * This is the supported iOS upgrade path — the suite runtime-skips on Sauce public RDC.
 *
 * Required env vars / defaults:
 *   PREV_IOS_APP — filename of the previous release IPA in e2e/apps/ (default: BCSC-prev.ipa)
 *
 * Example:
 *   PREV_IOS_APP=BCSC-prev.ipa IOS_APP_DEVICE=BCSC.ipa \
 *     yarn wdio configs/local/wdio.ios.local.device.upgrade.conf.ts --suite upgrade
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
    'appium:app': resolve(__dirname, '../../apps', process.env.PREV_IOS_APP || 'BCSC-prev.ipa'),
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
