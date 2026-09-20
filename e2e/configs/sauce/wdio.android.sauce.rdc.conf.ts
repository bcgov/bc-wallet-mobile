// sauce/wdio.android.sauce.rdc.conf.ts
import {
  DEVICE_AUTH_SPECS,
  NON_DEVICE_AUTH_SPECS,
  NON_SEND_VIDEO_SPECS,
  SEND_VIDEO_SPECS,
} from '../wdio.shared.conf.js'
import {
  DEVICE_SECURITY_LANE,
  config as sauceConfig,
  sauceRdcOptions,
  sauceRdcOptionsNoCameraInjection,
} from './wdio.shared.sauce.conf.js'

const appFilename = process.env.ANDROID_APP_FILENAME || 'BCSC-Dev-latest.apk'

const config = { ...sauceConfig }

const androidCaps = {
  platformName: 'Android',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Google.*',
  'appium:automationName': 'UiAutomator2',
  'appium:app': `storage:filename=${appFilename}`,
  'appium:noReset': false,
  'appium:fullReset': true,
  'appium:newCommandTimeout': 180,
  'appium:autoGrantPermissions': false,
  ...(process.env.ANDROID_PLATFORM_VERSION && {
    'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION,
  }),
}

/**
 * The device-authentication lane: the same session plus a real screen lock and biometric
 * interception, for the device-auth journeys ALONE — a locked device changes the state every other
 * journey starts from. Excludes everything else, so `--suite device-auth` schedules only this lane and
 * a regular suite never inherits the lock.
 */
const deviceAuthLane = {
  ...androidCaps,
  'wdio:exclude': NON_DEVICE_AUTH_SPECS,
  'sauce:options': { ...sauceRdcOptions, ...DEVICE_SECURITY_LANE },
}

/**
 * Three capability lanes: everything with camera injection EXCEPT the send-video journeys, which get a
 * session withOUT the injection instrumentation (it hooks the whole camera pipeline and wrecks the
 * recorder's stop/finalize — the app's "Recording error" modal on every Sauce Android recording) and
 * capture from the rack feed instead; the scripted reviewer never looks at the content — and the
 * device-auth lane above.
 *
 * The exclude lists are complementary by construction (wdio.shared.conf.ts), and capability-level
 * `wdio:exclude` composes with --suite AND --spec — unlike `wdio:specs`, which --suite discards — so
 * every spec routes to exactly one lane under any invocation, and a lane left with no specs is never
 * scheduled — `--suite send-video` runs the injection-off lane alone, `E2E_EXCLUDE_SEND_VIDEO=1` the
 * injection lane alone (that is how CI keeps send-video to one platform at a time). `config.maxInstances` caps the lanes
 * GLOBALLY: at the default 1 the injection lane drains fully, then send-video runs as a strictly
 * serial tail block (the blind-FIFO review queue requires that), retries included.
 *
 * SAUCE_CAMERA_INJECTION=1 collapses the first two to the single injection-on capability (the A/B
 * baseline arm); the device-auth lane stays its own.
 */
config.capabilities =
  process.env.SAUCE_CAMERA_INJECTION === '1' || SEND_VIDEO_SPECS.length === 0
    ? [{ ...androidCaps, 'wdio:exclude': DEVICE_AUTH_SPECS, 'sauce:options': sauceRdcOptions }, deviceAuthLane]
    : [
        {
          ...androidCaps,
          'wdio:exclude': [...SEND_VIDEO_SPECS, ...DEVICE_AUTH_SPECS],
          'sauce:options': sauceRdcOptions,
        },
        {
          ...androidCaps,
          // Never more than one send-video session even if SAUCE_MAX_INSTANCES is raised — the
          // review portal claims the next queued request blindly.
          'wdio:maxInstances': 1,
          'wdio:exclude': NON_SEND_VIDEO_SPECS,
          'sauce:options': sauceRdcOptionsNoCameraInjection,
        },
        deviceAuthLane,
      ]

export { config }
