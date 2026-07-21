// wdio.shared.conf.ts
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { browser } from '@wdio/globals'
import dotenv from 'dotenv'
import { getE2EConfig } from '../src/e2eConfig.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.e2e before reading config so VARIANT is available
dotenv.config({ path: resolve(__dirname, '../.env.e2e') })

const { variant } = getE2EConfig()

/** All reporter + screenshot output lands here (gitignored; uploaded as CI artifacts). */
const REPORTS_DIR = resolve(__dirname, '../reports')

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
    onboarding: [resolve(__dirname, `../test/${variant}/journeys/onboarding/*.journey.ts`)],
    auth: [resolve(__dirname, `../test/${variant}/journeys/auth/*.journey.ts`)],
    verify: [resolve(__dirname, `../test/${variant}/journeys/verify/*.journey.ts`)],
    main: [resolve(__dirname, `../test/${variant}/journeys/main/*.journey.ts`)],
    'happy-path': [resolve(__dirname, `../test/${variant}/happy-path.spec.ts`)],
    'full-regression': [resolve(__dirname, `../test/${variant}/full-regression/*.spec.ts`)],
    biometrics: [resolve(__dirname, `../test/${variant}/manual/biometrics.spec.ts`)],
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
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 2,

  framework: 'mocha',
  reporters: [
    'spec',
    ['junit', { outputDir: join(REPORTS_DIR, 'junit'), outputFileFormat: (opts: { cid: string }) => `wdio-${opts.cid}.xml` }],
    ['allure', { outputDir: join(REPORTS_DIR, 'allure'), disableWebdriverStepsReporting: true, disableWebdriverScreenshotsReporting: false }],
  ],
  mochaOpts: {
    ui: 'bdd',
    timeout: 600_000, // 10 min per test — generous for real devices
    bail: true, // Checkpoints within a file are order-dependent — abort the rest of the file on first failure
  },

  afterTest: async (test, _context, result) => {
    await captureFailureScreenshot(test, result)
  },
}
