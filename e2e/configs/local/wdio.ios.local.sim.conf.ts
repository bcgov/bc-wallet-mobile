// local/wdio.ios.local.sim.conf.ts
import { resolve } from 'path'
import { config as localConfig } from './wdio.shared.local.appium.conf'

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE || 'iPhone 16',
    'appium:platformVersion': process.env.IOS_VERSION || '18.3',
    'appium:automationName': 'XCUITest',
    'appium:app': resolve(__dirname, '../../apps', process.env.IOS_APP || 'BCSC.app'),
    'appium:newCommandTimeout': 180,
  },
]

export { config }
