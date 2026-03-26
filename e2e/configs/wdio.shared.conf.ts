// wdio.shared.conf.ts
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import { getE2EConfig } from '../src/e2eConfig.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.saucelabs before reading config so VARIANT is available
dotenv.config({ path: resolve(__dirname, '../.env.saucelabs') })

const { variant } = getE2EConfig()

export const config: WebdriverIO.Config = {
  specs: [resolve(__dirname, `../test/${variant}/smoke.spec.ts`)],
  suites: {
    smoke: [resolve(__dirname, `../test/${variant}/smoke.spec.ts`)],
    'happy-path': [resolve(__dirname, `../test/${variant}/happy-path.spec.ts`)],
    'full-regression': [resolve(__dirname, `../test/${variant}/full-regression.spec.ts`)],
  },
  exclude: [],
  capabilities: [],

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 20_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 2,

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 600_000, // 10 min per test — generous for real devices
  },

  // Hooks for SauceLabs test status reporting
  afterTest: async (test, _context, { passed }) => {
    // Implemented in sauce config override
  },
}
