// local/wdio.ios.local.device.conf.ts — iOS real device (USB-connected)
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config as localConfig } from './wdio.shared.local.appium.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const config = { ...localConfig }

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:deviceName': process.env.IOS_DEVICE || 'iPhone',
    'appium:platformVersion': process.env.IOS_VERSION || '',
    'appium:udid': process.env.IOS_UDID || '',
    'appium:automationName': 'XCUITest',
    'appium:app': resolve(__dirname, '../../apps', process.env.IOS_APP_DEVICE || 'BCWallet.ipa'),
    'appium:xcodeOrgId': process.env.XCODE_ORG_ID || '',
    'appium:xcodeSigningId': process.env.XCODE_SIGNING_ID || 'iPhone Developer',
    'appium:noReset': process.env.NO_RESET === 'true',
    'appium:newCommandTimeout': 180,
  },
]

export { config }
