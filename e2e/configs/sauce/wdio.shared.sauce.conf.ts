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
config.maxInstances = 2

config.services = [
  [
    'sauce',
    {
      // Name each Sauce job after the spec it runs. The service only gives this callback the
      // *global* runner config — whose top-level `specs` is always the hardcoded default
      // (`smoke.spec.ts`), NOT the file this worker is running — so deriving the name from
      // `runnerConfig.specs` labels every parallel job "Smoke". `suiteTitle` is the per-worker
      // signal: the running file's Mocha `describe(...)` title (e.g. "Verify journey: entry
      // detours"), which is already human-readable. TEST_NAME still overrides for one-off runs.
      setJobName: (_runnerConfig: Options.Testrunner, _caps: unknown, suiteTitle: string) =>
        process.env.TEST_NAME || suiteTitle || 'E2E Tests',
    },
  ],
]

/** Shared Sauce RDC session options (biometrics, image injection, build metadata). */
const sauceRdcOptions = {
  appiumVersion: 'latest',
  build: process.env.BUILD_NAME || `local-${Date.now()}`,
  name: process.env.TEST_NAME || 'E2E Tests',
  phoneOnly: true,
  sauceLabsImageInjectionEnabled: true,
  /** Sauce RDC; not on WebdriverIO's SauceLabsCapabilities type yet */
  imageInjection: true,
}

config.afterTest = async function (test, _context, result) {
  await captureFailureScreenshot(test, result)
  await browser.execute(`sauce:job-result=${result.passed ? 'passed' : 'failed'}`)
}

export { config, sauceRdcOptions }
