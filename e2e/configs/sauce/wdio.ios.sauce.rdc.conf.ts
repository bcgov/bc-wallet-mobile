// sauce/wdio.ios.sauce.rdc.conf.ts
import { config as sauceConfig } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.IOS_APP_FILENAME || 'BCSC-Dev-latest.ipa'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': 'iPhone.*',
    'appium:automationName': 'XCUITest',
    'appium:app': `storage:filename=${appFilename}`,
    'appium:newCommandTimeout': 180,
    'sauce:options': {
      appiumVersion: 'latest',
      build: process.env.BUILD_NAME || `local-${Date.now()}`,
      name: process.env.TEST_NAME || 'E2E Tests',
      phoneOnly: true,
      allowTouchIdEnroll: true,
      sauceLabsImageInjectionEnabled: true,
    },
  },
]

export { config }
