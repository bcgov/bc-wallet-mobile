// sauce/wdio.shared.sauce.conf.ts
/// <reference types="@wdio/globals/types" />

import { config as baseConfig } from '../wdio.shared.conf'

const config = { ...baseConfig }

config.user = process.env.SAUCE_USERNAME
config.key = process.env.SAUCE_ACCESS_KEY
config.region = (process.env.SAUCE_REGION || 'us') as 'us' | 'eu'
config.maxInstances = 2

config.services = ['sauce']

config.afterTest = async function (test, _context, { passed }) {
  // SauceLabs test status annotation
  await browser.execute(`sauce:job-result=${passed ? 'passed' : 'failed'}`)
}

export { config }
