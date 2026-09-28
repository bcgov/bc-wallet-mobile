// sauce/wdio.android.sauce.upgrade.conf.ts
/**
 * SauceLabs Android config for upgrade tests (previous release → current).
 *
 * Starts with the previous released Android build (PREV_ANDROID_APP — default `BCSC-prev.apk`,
 * the rolling Sauce storage name refreshed by the publish/refresh workflows). The upgrade suite
 * installs the current build over it mid-test using `driver.installApp()`.
 *
 * versionCode = build run number, so the previous build must be an OLDER run number than the
 * current one — Android refuses downgrade installs.
 *
 * Key differences from the standard Android sauce config:
 * - `appium:app` points to the previous release (PREV_ANDROID_APP)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 *
 * Two capability lanes, split like the RDC config's send-video lane: the send-video upgrade specs run
 * withOUT camera-injection instrumentation (it wrecks the recorder's stop/finalize), every other
 * upgrade spec runs WITH injection (the non-BCSC capture needs it). The `wdio:exclude` lists are
 * complementary and compose with `--suite`, so each spec routes to exactly one lane and a lane with no
 * specs is never scheduled (`--suite upgradeSendVideo` runs the injection-off lane alone; every other
 * upgrade-family suite — `upgrade` / `upgradeExtra` / `upgrade403` / `upgrade403Extra` / `upgradeV3`
 * — the injection-on lane alone). Which previous build boots is the suite's business (PREV_ANDROID_APP).
 */
import { UPGRADE_SEND_VIDEO_SPECS, UPGRADE_STANDARD_SPECS } from '../wdio.shared.conf.js'
import {
  config as sauceConfig,
  sauceRdcOptions,
  sauceRdcOptionsNoCameraInjection,
} from './wdio.shared.sauce.conf.js'

const prevAppFilename = process.env.PREV_ANDROID_APP || 'BCSC-prev.apk'

const config = { ...sauceConfig }

const androidCaps = {
  platformName: 'Android',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Google.*',
  'appium:automationName': 'UiAutomator2',
  'appium:app': `storage:filename=${prevAppFilename}`,
  'appium:noReset': false,
  'appium:fullReset': true,
  'appium:newCommandTimeout': 240,
  'appium:autoGrantPermissions': false,
  ...(process.env.ANDROID_PLATFORM_VERSION && {
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION,
  }),
}

config.capabilities = [
  {
    ...androidCaps,
    // Injection ON — the default upgrade lane (non-BCSC document capture needs it).
    'wdio:exclude': UPGRADE_SEND_VIDEO_SPECS,
    'sauce:options': {
      ...sauceRdcOptions,
      name: process.env.TEST_NAME || 'Upgrade from previous release (Android)',
    },
  },
  {
    ...androidCaps,
    // Injection OFF — the send-video upgrade spec, so the recorder's stop/finalize survives. Never
    // more than one session (the blind-FIFO review queue), even if SAUCE_MAX_INSTANCES is raised.
    'wdio:maxInstances': 1,
    'wdio:exclude': UPGRADE_STANDARD_SPECS,
    'sauce:options': {
      ...sauceRdcOptionsNoCameraInjection,
      name: process.env.TEST_NAME || 'Upgrade with a pending send-video review (Android)',
    },
  },
]

export { config }
