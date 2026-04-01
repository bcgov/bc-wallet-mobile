// sauce/wdio.shared.sauce.conf.ts
/// <reference types="@wdio/globals/types" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import { config as baseConfig } from '../wdio.shared.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env.saucelabs') })

const config = { ...baseConfig }

config.user = process.env.SAUCE_USERNAME
config.key = process.env.SAUCE_ACCESS_KEY
config.region = (process.env.SAUCE_REGION || 'us') as 'us' | 'eu'
config.maxInstances = 2

config.services = ['sauce']

/** Shared Sauce RDC session options (biometrics, image injection, build metadata). */
const sauceRdcOptions = {
  appiumVersion: 'latest',
  build: process.env.BUILD_NAME || `local-${Date.now()}`,
  name: process.env.TEST_NAME || 'E2E Tests',
  phoneOnly: true,
  allowTouchIdEnroll: true,
  resigningEnabled: true,
  /** Sauce RDC; not on WebdriverIO's SauceLabsCapabilities type yet */
  imageInjection: true,
}

config.afterTest = async function (test, _context, { passed }) {
  // SauceLabs test status annotation
  await browser.execute(`sauce:job-result=${passed ? 'passed' : 'failed'}`)
}

export { config, sauceRdcOptions }
