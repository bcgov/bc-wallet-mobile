// local/wdio.android.local.emu.conf.ts
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Pixel_7_API_35',
    'appium:platformVersion': process.env.ANDROID_VERSION || '15.0',
    'appium:automationName': 'UiAutomator2',
    'appium:app': resolve(__dirname, '../../apps', process.env.ANDROID_APP || 'BCWallet.apk'),
    'appium:noReset': true,
    'appium:newCommandTimeout': 180,
  },
]

export { config }
