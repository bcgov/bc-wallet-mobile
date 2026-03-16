// sauce/wdio.android.sauce.rdc.conf.ts
import { config as sauceConfig } from './wdio.shared.sauce.conf.js'

const appFilename = process.env.APP_FILENAME || 'BCSC-Dev-latest.aab'

const config = { ...sauceConfig }

config.capabilities = [
  {
    platformName: 'Android',
    'appium:deviceName': 'Google.*',
    'appium:automationName': 'UiAutomator2',
    'appium:app': `storage:filename=${appFilename}`,
    'appium:newCommandTimeout': 180,
    'sauce:options': {
      appiumVersion: 'latest',
      build: process.env.BUILD_NAME || `local-${Date.now()}`,
      name: process.env.TEST_NAME || 'E2E Tests',
      phoneOnly: true,
    },
  },
]

export { config }
