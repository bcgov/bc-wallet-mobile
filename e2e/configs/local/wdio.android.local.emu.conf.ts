// local/wdio.android.local.emu.conf.ts
import { resolve } from 'path'
import { config as localConfig } from './wdio.shared.local.appium.conf'

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE || 'Pixel_7_API_34',
    'appium:platformVersion': process.env.ANDROID_VERSION || '14.0',
    'appium:automationName': 'UiAutomator2',
    'appium:app': resolve(__dirname, '../../apps', process.env.ANDROID_APP || 'BCSC.apk'),
    'appium:noReset': true,
    'appium:newCommandTimeout': 180,
  },
]

export { config }
