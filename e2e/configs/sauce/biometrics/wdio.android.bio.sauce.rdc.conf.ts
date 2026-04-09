// sauce/biometrics/wdio.android.bio.sauce.rdc.conf.ts
import { config as sauceConfig } from '../wdio.android.sauce.rdc.conf.js'
import { sauceRdcOptions } from '../wdio.shared.sauce.conf.js'

const config = { ...sauceConfig }

config.capabilities = [
  {
    ...sauceConfig.capabilities[0],
    'sauce:options': {
      ...sauceRdcOptions,
      allowTouchIdEnroll: true,
    },
  },
]

export { config }
