// wdio.shared.conf.ts
import { mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { browser } from '@wdio/globals'
import type { Frameworks } from '@wdio/types'
import dotenv from 'dotenv'
import { getE2EConfig } from '../src/e2eConfig.js'
import { acceptSystemAlert } from '../src/helpers/alerts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.e2e before reading config so VARIANT is available
dotenv.config({ path: resolve(__dirname, '../.env.e2e') })

const { variant } = getE2EConfig()

/** All reporter + screenshot output lands here (gitignored; uploaded as CI artifacts). */
const REPORTS_DIR = resolve(__dirname, '../reports')

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
    main: [resolve(__dirname, `../test/${variant}/main/*.journey.ts`)],
    // Card-barcode scanning: Sauce + Android only (see ANDROID_ONLY_SPECS). Its own suite for targeted
    // runs, and part of `regression` — the iOS configs exclude it rather than schedule and skip it.
    scan: ANDROID_ONLY_SPECS,
    // Nightly full run: every per-area journey.
    // Excludes `migration` — that suite boots the v3 app via the separate migration config, so it
    // cannot share this run's v4 RDC build (it stays its own suite + workflow path).
    regression: [
      resolve(__dirname, `../test/${variant}/onboarding/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/auth/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/verify/*.journey.ts`),
      resolve(__dirname, `../test/${variant}/main/*.journey.ts`),
      ...ANDROID_ONLY_SPECS,
    ],
    migration: [resolve(__dirname, `../test/${variant}/migration/migration.spec.ts`)],
  },
  exclude: [],
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
  before: async () => {
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
    if (wasSkipped(result)) return // a skip has no failure to capture
    await captureFailureScreenshot(test, result)
  },
}
