// sauce/wdio.shared.sauce.conf.ts
/// <reference types="@wdio/globals/types" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Options } from '@wdio/types'
import dotenv from 'dotenv'
import { captureFailureScreenshot, config as baseConfig } from '../wdio.shared.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env.saucelabs') })

const config = { ...baseConfig }

config.user = process.env.SAUCE_USERNAME
config.key = process.env.SAUCE_ACCESS_KEY
config.region = (process.env.SAUCE_REGION || 'us') as 'us' | 'eu'

/**
 * Workers per wdio process. The Sauce account allows 2 concurrent real-device sessions (`rds`),
 * and that budget is shared by EVERY wdio process running at once — each CI device-matrix entry is
 * its own process, so `max-parallel` caps GitHub jobs, not Sauce sessions. Two jobs x two workers
 * asks for four sessions against a two-session limit.
 *
 * Over-subscribing does not fail fast: Sauce holds `POST /session` open while the request waits for
 * a free slot/device, so the excess workers sit in the queue until the client aborts at
 * `connectionRetryTimeout` and reports "Failed to create a session".
 *
 * Default to 1 so the two-platform matrix stays inside the budget; CI raises it when fewer jobs
 * run in parallel (see SAUCE_MAX_INSTANCES in .github/workflows/e2e.yml).
 */
config.maxInstances = Number(process.env.SAUCE_MAX_INSTANCES) || 1

/**
 * Raised well above the shared default (180s) because on Sauce it also bounds `POST /session`, which
 * stays open while the run queues for a free concurrency slot and a matching device — Sauce itself
 * keeps hunting for up to 15 min. A short value turns an ordinary queue wait into "Failed to create
 * a session". The lower default stays in place for local Appium runs, where a session that cannot be
 * created should fail fast rather than hang.
 */
config.connectionRetryTimeout = 600_000

/**
 * Re-run a FAILED journey file once, in a brand-new session.
 *
 * The failures this clears are the device's, not the suite's: a rack camera that will not start a
 * recording, a session that comes up with a wedged WebDriverAgent. Nothing in-process can retry past
 * those — the app is already in an unrecoverable state by the time we see it — and a fresh session is
 * exactly what a human does. Journeys are self-contained (each onboards from a clean install), so a
 * retry starts from the same place the first attempt did.
 *
 * Only failed files re-run, so the cost is proportional to the failures, not the suite. Retries are
 * deferred to the end of the queue by default, which keeps the send-video journeys' one-at-a-time
 * agent-queue rule intact at `maxInstances: 1`.
 *
 * Set SAUCE_SPEC_RETRIES=0 to see the raw pass rate (what a flake investigation wants).
 */
const requestedRetries = Number(process.env.SAUCE_SPEC_RETRIES)
config.specFileRetries = Number.isInteger(requestedRetries) && requestedRetries >= 0 ? requestedRetries : 1

config.services = [
  [
    'sauce',
    {
      // Name each Sauce job after the spec it runs. The service only gives this callback the
      // *global* runner config — whose top-level `specs` is always the hardcoded default
      // (`smoke.spec.ts`), NOT the file this worker is running — so deriving the name from
      // `runnerConfig.specs` labels every parallel job "Smoke". `suiteTitle` is the per-worker
      // signal: the running file's Mocha `describe(...)` title (e.g. "Verify journey: entry
      // detours"), which is already human-readable. TEST_NAME (e.g. nightly's
      // "E2E regression - Android 15") is a PREFIX, not an override — as an override every job
      // in a run shares one name and the Sauce job list cannot tell the journeys apart.
      setJobName: (_runnerConfig: Options.Testrunner, _caps: unknown, suiteTitle: string) =>
        [process.env.TEST_NAME, suiteTitle].filter(Boolean).join(' - ') || 'E2E Tests',
    },
  ],
]

/**
 * Shared Sauce RDC session options WITHOUT camera injection — the Android send-video lane
 * (see wdio.android.sauce.rdc.conf.ts): injection instruments the whole camera pipeline, which
 * kills the recorder's stop/finalize, and those journeys record from the rack feed instead.
 */
const sauceRdcOptionsNoCameraInjection = {
  appiumVersion: 'latest',
  build: process.env.BUILD_NAME || `local-${Date.now()}`,
  name: process.env.TEST_NAME || 'E2E Tests',
  phoneOnly: true,
}

/** Shared Sauce RDC session options (biometrics, image injection, build metadata) — the default. */
const sauceRdcOptions = {
  ...sauceRdcOptionsNoCameraInjection,
  sauceLabsImageInjectionEnabled: true,
  /** Sauce RDC; not on WebdriverIO's SauceLabsCapabilities type yet */
  imageInjection: true,
}

config.afterTest = async function (test, _context, result) {
  await captureFailureScreenshot(test, result)
  await browser.execute(`sauce:job-result=${result.passed ? 'passed' : 'failed'}`)
}

export { config, sauceRdcOptions, sauceRdcOptionsNoCameraInjection }
