// local/wdio.android.local.emu.conf.ts
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ANDROID_TIME_ZONE_CAPS } from '../wdio.shared.conf.js'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Pixel_7_API_35',
    'appium:platformVersion': process.env.ANDROID_VERSION || '15.0',
    'appium:automationName': 'UiAutomator2',
    ...ANDROID_TIME_ZONE_CAPS,
    'appium:app': resolve(__dirname, '../../apps', process.env.ANDROID_APP || 'BCWallet.apk'),
    'appium:noReset': process.env.NO_RESET === 'true',
    'appium:newCommandTimeout': 180,
    'appium:autoGrantPermissions': false,
  },
]

export { config }
