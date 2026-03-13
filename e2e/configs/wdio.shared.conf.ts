// wdio.shared.conf.ts
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const config: WebdriverIO.Config = {
  specs: [resolve(__dirname, '../test/**/*.spec.ts')],
  // Selective spec execution via CLI: --spec test/smoke.spec.ts
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
