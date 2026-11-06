// local/wdio.ios.local.device.upgrade.conf.ts — iOS real device upgrade (a shipped version → current)
/**
 * Starts with a shipped IPA on a USB-connected iOS device: `BCSC-v<PREV_VERSION>.ipa` in e2e/apps/
 * (built from the version's tag — a Sauce-stored ipa is signed for another team; e2e/apps/README.md),
 * or the file PREV_IOS_APP names. The upgrade suites install the current IPA mid-test via
 * `driver.installApp()`. Local real-device alternative to the Sauce lane
 * (configs/sauce/wdio.ios.sauce.upgrade.conf.ts).
 *
 * Example:
 *   PREV_VERSION=4.1.3 IOS_APP_DEVICE=BCSC.ipa \
 *     yarn wdio configs/local/wdio.ios.local.device.upgrade.conf.ts --suite upgradePartial
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePrevApp } from '../../src/flows/prev-build/sources.js'
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
    'appium:app': resolve(__dirname, '../../apps', resolvePrevApp('ios').app),
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
