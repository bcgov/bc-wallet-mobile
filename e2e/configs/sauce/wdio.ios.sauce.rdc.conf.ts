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
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 180,
    'sauce:options': {
      appiumVersion: 'latest',
      build: process.env.BUILD_NAME || `local-${Date.now()}`,
      name: process.env.TEST_NAME || 'E2E Tests',
      phoneOnly: true,
      allowTouchIdEnroll: true,
      resigningEnabled: true,
      sauceLabsImageInjectionEnabled: true,
      // @ts-expect-error — present in Sauce RDC docs; not yet on WebdriverIO SauceLabsCapabilities type
      biometricsInterception: true,
    },
  },
]

export { config }
