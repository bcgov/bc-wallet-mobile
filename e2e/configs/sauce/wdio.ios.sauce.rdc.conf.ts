// sauce/wdio.ios.sauce.rdc.conf.ts
import { config as sauceConfig, sauceRdcOptions } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.IOS_APP_FILENAME || 'BCSC-Dev-latest.ipa'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': 'iPhone.*',
    'appium:automationName': 'XCUITest',
    'appium:app': `storage:filename=${appFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 180,
    'appium:autoAcceptAlerts': false,
    'sauce:options': sauceRdcOptions,
  },
]

export { config }
