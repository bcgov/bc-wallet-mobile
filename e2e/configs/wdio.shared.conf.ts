// wdio.shared.conf.ts
import { mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { browser } from '@wdio/globals'
import type { Frameworks } from '@wdio/types'
import dotenv from 'dotenv'
import { getE2EConfig } from '../src/e2eConfig.js'
import { lineageOf, PREV_VERSION_ENV } from '../src/flows/prev-build/sources.js'
import { acceptSystemAlert } from '../src/helpers/alerts.js'
import { upgradeSpecsFor, type UpgradeState } from '../src/upgrade-matrix.js'
import { recordSessionEnd, recordSessionStart, recordTestResult } from '../src/helpers/session-record.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.e2e before reading config so VARIANT is available
dotenv.config({ path: resolve(__dirname, '../.env.e2e') })

const { variant } = getE2EConfig()

/** All reporter + screenshot output lands here (gitignored; uploaded as CI artifacts). */
const REPORTS_DIR = resolve(__dirname, '../reports')

/**
 * Every session runs in BC's current offset: permanent UTC-7, encoded as standard time from 2026-11-01.
 * Whitehorse has had that same encoding since 2020, so it reproduces BC's date bugs (e.g. Hermes
 * formatting pre-change calendar dates a day early) on devices whose timezone data predates BC's change.
 * iOS overrides the app process only (`TZ`); Android sets the device zone, which persists after the
 * session — so the local physical-device Android configs leave it out.
 */
export const E2E_TIME_ZONE = 'America/Whitehorse'
export const IOS_TIME_ZONE_CAPS = { 'appium:appTimeZone': E2E_TIME_ZONE }
export const ANDROID_TIME_ZONE_CAPS = { 'appium:timeZone': E2E_TIME_ZONE }

/**
 * Card-barcode scanning journeys — ANDROID ONLY. Android reads codes off the frame buffer with MLKit,
 * which Sauce's injection replaces wholesale; iOS scans via `AVCaptureMetadataOutput`, which Sauce
 * feeds for QR alone. Every iOS config sets `exclude` to this, so a run never spends a session just to
 * reach the in-test skip.
 */
export const ANDROID_ONLY_SPECS = [resolve(__dirname, `../test/${variant}/scan/*.journey.ts`)]

/**
 * Send-video journeys vs everything else, partitioned from ONE scan of the test tree so the two sets
 * are complementary by construction (a new spec file lands in the default lane automatically). On
 * Sauce Android they run in separate capability lanes: send-video WITHOUT the camera-injection
 * instrumentation (it rides the whole camera pipeline and wrecks the recorder's stop/finalize),
 * the rest with it (see sauce/wdio.android.sauce.rdc.conf.ts).
 */
const TEST_ROOT = resolve(__dirname, `../test/${variant}`)
const ALL_SPEC_FILES = readdirSync(TEST_ROOT, { recursive: true })
  .map((entry) => join(TEST_ROOT, String(entry)))
  .filter((path) => /\.(journey|spec)\.ts$/.test(path))
const isSendVideoSpec = (path: string) => /\/verify\/send-video-[^/]+\.journey\.ts$/.test(path)
export const SEND_VIDEO_SPECS = ALL_SPEC_FILES.filter(isSendVideoSpec)
export const NON_SEND_VIDEO_SPECS = ALL_SPEC_FILES.filter((path) => !isSendVideoSpec(path))

/**
 * The device-authentication journeys, partitioned the same way. They need a session whose device
 * carries a screen lock plus biometric interception (`setupDeviceLock` + `biometricsInterception`), and
 * a locked device changes the state every OTHER journey starts from — the secure-app step renders two
 * options, the device can lock mid-session — so the Sauce configs give them a capability lane of their
 * own and exclude them from every other lane. Never a global switch.
 */
const isDeviceAuthSpec = (path: string) => /\/device-auth\/[^/]+\.journey\.ts$/.test(path)
export const DEVICE_AUTH_SPECS = ALL_SPEC_FILES.filter(isDeviceAuthSpec)
export const NON_DEVICE_AUTH_SPECS = ALL_SPEC_FILES.filter((path) => !isDeviceAuthSpec(path))

/**
 * The upgrade folder's send-video specs, split off from the rest of it. They submit a send-video
 * request on the previous build, so on Android they need the same injection-OFF session the
 * `send-video` lane uses (the injection instrumentation wrecks the recorder's stop/finalize), while
 * the other upgrade specs (non-BCSC capture) need injection ON. The Android upgrade config splits into
 * two lanes on these arrays, exactly like the RDC config's send-video split. iOS needs no split — its
 * recorder survives injection. Lane routing only: the upgrade suites below list their specs by name.
 */
const isUpgradeSpec = (path: string) => /\/upgrade\/[^/]+\.spec\.ts$/.test(path)
const isUpgradeSendVideoSpec = (path: string) => /\/upgrade\/upgrade-send-video-[^/]+\.spec\.ts$/.test(path)
export const UPGRADE_SEND_VIDEO_SPECS = ALL_SPEC_FILES.filter(isUpgradeSendVideoSpec)
export const UPGRADE_STANDARD_SPECS = ALL_SPEC_FILES.filter((path) => isUpgradeSpec(path) && !isUpgradeSendVideoSpec(path))

/**
 * The upgrade suites are STATE GROUPS, one per column of the weekly upgrade matrix. Each boots the
 * shipped build `PREV_VERSION` names (the upgrade configs resolve `BCSC-v<version>.*` from
 * e2e/upgrade-sources.json) and schedules the wrapper specs src/upgrade-matrix.ts gives that build's
 * lineage, so a lineage that cannot arrange a path schedules nothing for it — no runtime skips, and the
 * brief reads the missing cell as n/a from the same matrix. With PREV_VERSION unset (every non-upgrade
 * run) a suite is the union over the lineages, and each wrapper names the missing variable as its
 * first failure.
 *
 * Built when called, not at import: `.env.saucelabs` may set PREV_VERSION, and the Sauce config loads
 * it only after this module has evaluated, so that config calls this again once its env is in.
 */
export function upgradeSuites(): Record<string, string[]> {
  const prevVersion = process.env[PREV_VERSION_ENV]
  const prevLineage = prevVersion ? lineageOf(prevVersion) : undefined
  const upgradeSuite = (state: UpgradeState): string[] =>
    upgradeSpecsFor(state, prevLineage).map((name) => resolve(__dirname, `../test/${variant}/upgrade/${name}.spec.ts`))
  return {
    // Partial: nothing submitted — the unverified account (the base PIN/settings check, one spec per
    // lineage), a saved serial, a captured document awaiting its number, partial non-BCSC progress.
    // No IDCheck, no review queue: the platforms can run in parallel.
    upgradePartial: upgradeSuite('partial'),
    // Submitted: a request the server holds but has not decided — an unapproved in-person code, a
    // pending send-video review (Android injection-off lane, the blind-FIFO queue drained first). One
    // platform at a time: the queue, and the in-person approval verifies the shared persona.
    upgradeSubmitted: upgradeSuite('submitted'),
    // Approved, not finished in-app: the decision landed while the app was closed and the update came
    // before the user reopened it. Same serial rules as upgradeSubmitted.
    upgradeApproved: upgradeSuite('approved'),
    // Completed: a verified account — the device credential must survive the swap. One platform at a
    // time (the shared persona: SIT keeps one active device per card).
    upgradeVerified: upgradeSuite('verified'),
  }
}

/**
 * `E2E_EXCLUDE_SEND_VIDEO=1` drops the send-video journeys from whatever suite runs. They review a
 * shared, blind-FIFO agent queue and must never run on two platforms at once, so CI keeps them out
 * of the concurrent device matrix and runs them one platform at a time via `--suite send-video`.
 */
export const EXCLUDE_SEND_VIDEO = process.env.E2E_EXCLUDE_SEND_VIDEO === '1'

/**
 * Did the test end in a runtime `this.skip()`? WDIO reports a skip as `{ passed: false, skipped: true }`
 * — a shape that reads as a FAILURE to anything checking `passed` alone — and `@wdio/types` does not
 * declare `skipped` yet.
 */
export function wasSkipped(result: Frameworks.TestResult): boolean {
  return (result as Frameworks.TestResult & { skipped?: boolean }).skipped === true
}

/**
 * Save a screenshot named after the failing test. The webdriver screenshot command also attaches
 * the image to the Allure report. Never throws — a screenshot problem must not mask the real
 * test failure.
 *
 * Sauce configs override `afterTest` (to report `sauce:job-result`) and must call this first.
 */
export async function captureFailureScreenshot(
  test: { parent?: string; title: string },
  result: { passed: boolean }
): Promise<void> {
  if (result.passed) return
  try {
    const dir = join(REPORTS_DIR, 'screenshots')
    mkdirSync(dir, { recursive: true })
    const name = [test.parent, test.title]
      .filter(Boolean)
      .join(' - ')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 120)
    await browser.saveScreenshot(join(dir, `${name || 'failure'}-${Date.now()}.png`))
  } catch (err) {
    console.warn('Failed to capture failure screenshot:', err)
  }
}

export const config: WebdriverIO.Config = {
  specs: [resolve(__dirname, `../test/${variant}/smoke.spec.ts`)],
  suites: {
    smoke: [resolve(__dirname, `../test/${variant}/smoke.spec.ts`)],
    onboarding: [resolve(__dirname, `../test/${variant}/onboarding/*.journey.ts`)],
    auth: [resolve(__dirname, `../test/${variant}/auth/*.journey.ts`)],
    verify: [resolve(__dirname, `../test/${variant}/verify/*.journey.ts`)],
    // The send-video journeys alone: CI's own sequential lane (see EXCLUDE_SEND_VIDEO).
    'send-video': SEND_VIDEO_SPECS,
    main: [resolve(__dirname, `../test/${variant}/main/*.journey.ts`)],
    // Card-barcode scanning: Sauce + Android only (see ANDROID_ONLY_SPECS). Its own suite for targeted
    // runs, and part of `regression` — the iOS configs exclude it rather than schedule and skip it.
    scan: ANDROID_ONLY_SPECS,
    // Automated accessibility audits over the core unverified screens (src/helpers/a11y-audit.ts).
    a11y: [resolve(__dirname, `../test/${variant}/a11y/*.journey.ts`)],
    // Device authentication on a LOCKED device (Sauce RDC only): its own capability lane, and not in
    // `regression` — see DEVICE_AUTH_SPECS.
    'device-auth': DEVICE_AUTH_SPECS,
    // Nightly full run: every per-area journey.
    // Excludes the upgrade suites — they boot an OLD build via their own configs, so they cannot share
    // this run's RDC build (each stays its own suite + workflow path).
    regression: [
      resolve(__dirname, `../test/${variant}/onboarding/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/auth/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/verify/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/main/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/a11y/*.journey.ts`),
      ...ANDROID_ONLY_SPECS,
    ],
    // The upgrade state groups — upgradePartial, upgradeSubmitted, upgradeApproved, upgradeVerified.
    ...upgradeSuites(),
  },
  // iOS configs append ANDROID_ONLY_SPECS to this — append, never assign, or the env exclusion is lost.
  exclude: EXCLUDE_SEND_VIDEO ? [...SEND_VIDEO_SPECS] : [],
  capabilities: [],

  logLevel: 'warn',
  // 0 = a failed spec FILE does not cancel the remaining files — each file is an independent
  // session (journey), so the rest of the run still reports. Within-file ordering is handled by
  // mochaOpts.bail below.
  bail: 0,
  waitforTimeout: 20_000,
  // Also the ceiling on how long `POST /session` may take, and session creation happens outside any
  // Mocha test so this is its only bound (in-test commands are bounded first by mochaOpts.timeout
  // below). Kept short here so a local run against a missing Appium server or an unavailable device
  // fails promptly; the Sauce config raises it to cover that grid's device-queue wait.
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 2,

  framework: 'mocha',
  reporters: [
    'spec',
    [
      'junit',
      { outputDir: join(REPORTS_DIR, 'junit'), outputFileFormat: (opts: { cid: string }) => `wdio-${opts.cid}.xml` },
    ],
    [
      'allure',
      {
        outputDir: join(REPORTS_DIR, 'allure'),
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
      },
    ],
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 600_000, // 10 min per test — generous for real devices
    bail: true, // Checkpoints within a file are order-dependent — abort the rest of the file on first failure
  },

  /**
   * Real iOS devices show a "Find and Connect to Devices on Your Local Network" permission prompt at
   * first launch, layered over the initial screen — accept it so the first interaction isn't
   * swallowed. No-op on Android; simulators/emulators don't show it (the short wait just elapses).
   * Best-effort: a stuck prompt must never fail the whole session.
   */
  before: async (_capabilities, specs) => {
    // First thing, so the record exists even if the session dies before its first checkpoint.
    recordSessionStart(browser.capabilities as Record<string, unknown>, specs, browser.sessionId)
    // Android (UiAutomator2): React Native's JS thread is essentially never "idle" from the
    // accessibility framework's perspective, so the driver's implicit waitForIdle burns its full
    // timeout (default ~10s) before AND after every interaction — turning each tap into a ~10s
    // wait. Zero it out; our explicit waitForDisplayed calls still gate on element readiness.
    if (browser.isAndroid) {
      try {
        await browser.updateSettings({ waitForIdleTimeout: 0 })
      } catch (err) {
        console.warn('[before] Failed to disable waitForIdleTimeout (continuing):', err)
      }
      return
    }
    if (!browser.isIOS) return
    try {
      await acceptSystemAlert(6_000)
    } catch (err) {
      console.warn('[before] iOS launch prompt handling failed (continuing):', err)
    }
  },

  afterTest: async (test, _context, result) => {
    recordTestResult(test, result)
    if (wasSkipped(result)) return // a skip has no failure to capture
    await captureFailureScreenshot(test, result)
  },

  // Runs before the runner deletes the session, so the record closes even when Sauce already killed it.
  after: (result) => {
    recordSessionEnd(result)
  },
}
