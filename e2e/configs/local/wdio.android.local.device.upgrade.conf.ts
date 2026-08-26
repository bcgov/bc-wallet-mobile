// local/wdio.android.local.device.upgrade.conf.ts — Android real device upgrade (previous release → current)
/**
 * Starts with the previous released APK on a USB-connected Android device.
 * The upgrade suite installs the current APK mid-test via `driver.installApp()`.
 *
 * Required env vars / defaults:
 *   PREV_ANDROID_APP — filename of the previous release APK in e2e/apps/ (default: BCSC-prev.apk)
 *
 * Example:
 *   PREV_ANDROID_APP=BCSC-prev.apk ANDROID_APP=BCSC.apk \
 *     yarn wdio configs/local/wdio.android.local.device.upgrade.conf.ts --suite upgrade
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    'appium:app': resolve(__dirname, '../../apps', process.env.PREV_ANDROID_APP || 'BCSC-prev.apk'),
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': false,
  },
]

export { config }
