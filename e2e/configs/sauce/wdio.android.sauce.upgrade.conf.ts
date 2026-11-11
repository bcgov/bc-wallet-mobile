// sauce/wdio.android.sauce.upgrade.conf.ts
/**
 * SauceLabs Android config for the upgrade suites (a shipped version → the current build).
 *
 * Starts with the shipped Android build `PREV_VERSION` names — `BCSC-v<version>.apk` in Sauce storage,
 * kept there by the publish + refresh workflows for every version in e2e/upgrade-sources.json
 * (`PREV_ANDROID_APP` overrides the file: any older build still in storage). The upgrade suites
 * install the current build over it mid-test using `driver.installApp()`.
 *
 * versionCode = build run number, so the previous build must be an OLDER run number than the
 * current one — Android refuses downgrade installs.
 *
 * Key differences from the standard Android sauce config:
 * - `appium:app` points to the previous build (PREV_VERSION / PREV_ANDROID_APP)
 * - `appium:noReset: false` and `appium:fullReset: true` for a clean start
 *
 * Two capability lanes, split like the RDC config's send-video lane: the send-video upgrade specs run
 * withOUT camera-injection instrumentation (it wrecks the recorder's stop/finalize), every other
 * upgrade spec runs WITH injection (the non-BCSC capture needs it). The `wdio:exclude` lists are
 * complementary and compose with `--suite`, so each spec routes to exactly one lane and a lane with no
 * specs is never scheduled (`upgradeSubmitted` / `upgradeApproved` on the 4.1.x lineage schedule both
 * lanes; every other suite + lineage the injection-on lane alone).
 */
import { resolvePrevApp } from '../../src/flows/prev-build/sources.js'
import { UPGRADE_SEND_VIDEO_SPECS, UPGRADE_STANDARD_SPECS } from '../wdio.shared.conf.js'
import {
  config as sauceConfig,
  sauceRdcOptions,
  sauceRdcOptionsNoCameraInjection,
} from './wdio.shared.sauce.conf.js'

const prev = resolvePrevApp('android')

const config = { ...sauceConfig }

const androidCaps = {
  platformName: 'Android',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Google.*',
  'appium:automationName': 'UiAutomator2',
  'appium:app': `storage:filename=${prev.app}`,
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
      name: process.env.TEST_NAME || `Upgrade from ${prev.version} (Android)`,
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
      name: process.env.TEST_NAME || `Upgrade from ${prev.version} with a send-video review (Android)`,
    },
  },
]

export { config }
