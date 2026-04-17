// sauce/verified/wdio.android.verified.sauce.rdc.conf.ts
import { config as sauceConfig } from '../wdio.android.sauce.rdc.conf.js'
import { sauceRdcOptions } from '../wdio.shared.sauce.conf.js'

const config = { ...sauceConfig }

// Sequential: specs share persisted app state across sessions
config.maxInstances = 1

config.capabilities = [
  {
    ...sauceConfig.capabilities[0],
    'appium:noReset': true,
    'appium:fullReset': false,
    'sauce:options': sauceRdcOptions,
  },
]

export { config }
