// local/wdio.android.local.device.conf.ts — Android real device (USB-connected)
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const METRO_PORT = 8081

/** System locations only — avoids PATH hijacking when spawning adb. */
const SECURE_PATH =
  process.platform === 'win32'
    ? ['C:\\Windows\\System32', 'C:\\Windows'].join(';')
    : ['/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(':')

function resolveAdbPath(): string {
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb'
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (sdkRoot) {
    const fromSdk = join(sdkRoot, 'platform-tools', adbName)
    if (existsSync(fromSdk)) return fromSdk
  }
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      const defaultSdk = join(localAppData, 'Android', 'Sdk', 'platform-tools', adbName)
      if (existsSync(defaultSdk)) return defaultSdk
    }
  } else {
    try {
      const whichOut = execFileSync('/usr/bin/which', [adbName], {
        encoding: 'utf8',
        env: process.env,
      }).trim()
      if (whichOut) return whichOut
    } catch {
      /* use bare name below */
    }
  }
  return adbName
}

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Android',
    'appium:platformVersion': process.env.ANDROID_VERSION || '',
    'appium:udid': process.env.ANDROID_UDID || '',
    'appium:automationName': 'UiAutomator2',
    'appium:app': resolve(__dirname, '../../apps', process.env.ANDROID_APP || 'BCWallet.apk'),
    'appium:noReset': process.env.NO_RESET === 'true',
    'appium:newCommandTimeout': 180,
  },
]

// So the device can reach Metro on the host (debug APK loads JS from packager)
config.onPrepare = async function (_config, _capabilities) {
  const udid = process.env.ANDROID_UDID
  const reverseSpec = `tcp:${METRO_PORT}`
  const adbArgs = udid ? ['-s', udid, 'reverse', reverseSpec, reverseSpec] : ['reverse', reverseSpec, reverseSpec]
  try {
    execFileSync(resolveAdbPath(), adbArgs, {
      stdio: 'inherit',
      env: { ...process.env, PATH: SECURE_PATH },
    })
  } catch (e) {
    console.warn(
      `adb reverse tcp:${METRO_PORT} tcp:${METRO_PORT} failed. Ensure Metro is running (yarn start in app/) and device is connected.`,
      e
    )
  }
}

export { config }
