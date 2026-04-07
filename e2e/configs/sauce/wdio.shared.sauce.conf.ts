// sauce/wdio.shared.sauce.conf.ts
/// <reference types="@wdio/globals/types" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Options } from '@wdio/types'
import dotenv from 'dotenv'
import { jobNameFromSpec } from '../../src/helpers/sauce.js'
import { config as baseConfig } from '../wdio.shared.conf.js'

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
      setJobName: (runnerConfig: Options.Testrunner, _caps: unknown, suiteTitle: string) => {
        if (process.env.TEST_NAME) return process.env.TEST_NAME
        const specEntry = runnerConfig.specs?.[0]
        const specPath = Array.isArray(specEntry) ? specEntry[0] : specEntry
        if (specPath) return jobNameFromSpec(specPath)
        return suiteTitle
      },
    },
  ],
]

/** Shared Sauce RDC session options (biometrics, image injection, build metadata). */
const sauceRdcOptions = {
  appiumVersion: 'latest',
  build: process.env.BUILD_NAME || `local-${Date.now()}`,
  name: process.env.TEST_NAME || 'E2E Tests',
  phoneOnly: true,
  /** Sauce RDC; not on WebdriverIO's SauceLabsCapabilities type yet */
  imageInjection: true,
}

config.afterTest = async function (test, _context, { passed }) {
  await browser.execute(`sauce:job-result=${passed ? 'passed' : 'failed'}`)
}

export { config, sauceRdcOptions }
