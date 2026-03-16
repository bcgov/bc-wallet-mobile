// local/wdio.android.local.device.conf.ts — Android real device (USB-connected)
import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const METRO_PORT = 8081

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Android',
    'appium:platformVersion': process.env.ANDROID_VERSION || '',
    'appium:udid': process.env.UDID || '',
    'appium:automationName': 'UiAutomator2',
    'appium:app': resolve(__dirname, '../../apps', process.env.ANDROID_APP || 'BCWallet.apk'),
    'appium:noReset': true,
    'appium:newCommandTimeout': 180,
  },
]

// So the device can reach Metro on the host (debug APK loads JS from packager)
config.onPrepare = async function (_config, _capabilities) {
  const udid = process.env.UDID
  const adbTarget = udid ? `-s ${udid}` : ''
  try {
    execSync(`adb ${adbTarget} reverse tcp:${METRO_PORT} tcp:${METRO_PORT}`, {
      stdio: 'inherit',
    })
  } catch (e) {
    console.warn(
      `adb reverse tcp:${METRO_PORT} tcp:${METRO_PORT} failed. Ensure Metro is running (yarn start in app/) and device is connected.`,
      e
    )
  }
}

export { config }
