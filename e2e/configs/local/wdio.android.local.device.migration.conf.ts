// local/wdio.android.local.device.migration.conf.ts — Android real device migration (v3 → v4)
/**
 * Starts with the v3 BC Services Card APK on a USB-connected Android device.
 * The migration suite installs the v4 APK mid-test via `driver.installApp()`.
 *
 * Required env vars / defaults:
 *   V3_ANDROID_APP  — filename of v3 APK in e2e/apps/ (default: BCSC-v3.apk)
 *   V4_APP_FILENAME — path to v4 APK for mid-test install (default: apps/BCWallet.apk)
 *
 * Example:
 *   V3_ANDROID_APP=BCSC-v3.apk V4_APP_FILENAME=$PWD/apps/BCWallet.apk \
 *     yarn wdio configs/local/wdio.android.local.device.migration.conf.ts --suite migration
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
    'appium:app': resolve(__dirname, '../../apps', process.env.V3_ANDROID_APP || 'BCSC-v3.apk'),
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 240,
    'appium:autoGrantPermissions': true,
  },
]

export { config }
