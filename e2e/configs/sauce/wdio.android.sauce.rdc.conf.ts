// sauce/wdio.android.sauce.rdc.conf.ts
import { config as sauceConfig } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.aab'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': 'Google.*',
    'appium:automationName': 'UiAutomator2',
    'appium:app': `storage:filename=${appFilename}`,
    'appium:noReset': false,
    'appium:fullReset': true,
    'appium:newCommandTimeout': 180,
    'appium:autoGrantPermissions': true,
    'sauce:options': {
      appiumVersion: 'latest',
      build: process.env.BUILD_NAME || `local-${Date.now()}`,
      name: process.env.TEST_NAME || 'E2E Tests',
      phoneOnly: true,
      allowTouchIdEnroll: true,
      resigningEnabled: true,
      // @ts-expect-error — present in Sauce RDC docs; not yet on WebdriverIO SauceLabsCapabilities type
      biometricsInterception: true,
      imageInjection: true,
      crashReporting: true,
    },
  },
]

export { config }
