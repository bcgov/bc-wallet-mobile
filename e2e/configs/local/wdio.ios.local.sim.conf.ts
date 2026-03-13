// local/wdio.ios.local.sim.conf.ts
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE || 'iPhone 16',
    'appium:platformVersion': process.env.IOS_VERSION || '18.5',
    'appium:automationName': 'XCUITest',
    'appium:app': resolve(__dirname, '../../apps', process.env.IOS_APP || 'BCWallet.app'),
    'appium:newCommandTimeout': 180,
  },
]

export { config }
