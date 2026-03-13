// local/wdio.shared.local.appium.conf.ts
import { config as baseConfig } from '../wdio.shared.conf'

const config = { ...baseConfig }

config.maxInstances = 1
config.services = [
  [
    'appium',
    {
      command: 'appium',
      args: {
        relaxedSecurity: true,
        allowInsecure: ['adb_shell'],
      },
    },
  ],
]

export { config }
