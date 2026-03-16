// local/wdio.shared.local.appium.conf.ts
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { config as baseConfig } from '../wdio.shared.conf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appiumHome = join(__dirname, '../../.appium')
process.env.APPIUM_HOME = appiumHome

const config = { ...baseConfig }

config.port = 4723
config.maxInstances = 1
config.services = [
    [
      'appium',
      {
        command: 'appium',
        logPath: join(__dirname, '../../logs'),
        args: {
          port: 4723,
          relaxedSecurity: true,
          allowInsecure: ['adb_shell'],
          logLevel: 'info',
        },
      },
    ],
]

export { config }
