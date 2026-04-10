// local/wdio.ios.local.device.conf.ts — iOS real device (USB-connected)
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    // Matches WDA automatic signing (Xcode 15+ rejects legacy "iPhone Developer" here).
    'appium:xcodeSigningId': process.env.XCODE_SIGNING_ID || 'Apple Development',
    // Set SHOW_XCODE_LOG=true to print full xcodebuild output when WDA fails (e.g. exit 65).
    'appium:showXcodeLog': process.env.SHOW_XCODE_LOG === 'true',
    'appium:noReset': process.env.NO_RESET === 'true',
    'appium:newCommandTimeout': 180,
    'appium:autoAcceptAlerts': true,
  },
]

export { config }
