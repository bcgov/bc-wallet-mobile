// local/wdio.android.local.device.upgrade.conf.ts — Android real device upgrade (a shipped version → current)
/**
 * Starts with a shipped APK on a USB-connected Android device: `BCSC-v<PREV_VERSION>.apk` in e2e/apps/
 * (pull it from the version's GitHub release — e2e/apps/README.md), or the file PREV_ANDROID_APP names.
 * The upgrade suites install the current APK mid-test via `driver.installApp()`.
 *
 * Example:
 *   PREV_VERSION=4.1.3 ANDROID_APP=BCSC.apk \
 *     yarn wdio configs/local/wdio.android.local.device.upgrade.conf.ts --suite upgradePartial
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePrevApp } from '../../src/flows/prev-build/sources.js'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Android',
    'appium:platformVersion': process.env.ANDROID_VERSION || '',
    'appium:udid': process.env.ANDROID_UDID || '',
    'appium:automationName': 'UiAutomator2',
    'appium:app': resolve(__dirname, '../../apps', resolvePrevApp('android').app),
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': false,
  },
]

export { config }
