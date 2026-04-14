// sauce/wdio.android.sauce.rdc.conf.ts
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.aab'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Google.*',
    'appium:automationName': 'UiAutomator2',
    'appium:app': `storage:filename=${appFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 180,
    'appium:autoGrantPermissions': true,
    ...(process.env.ANDROID_PLATFORM_VERSION && {
      'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION,
    }),
    'sauce:options': sauceRdcOptions,
  },
]

export { config }
