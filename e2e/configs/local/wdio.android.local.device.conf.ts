// local/wdio.android.local.device.conf.ts — Android real device (USB-connected)
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

export { config }
