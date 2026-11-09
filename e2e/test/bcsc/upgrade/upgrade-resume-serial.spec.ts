import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineResumeSerialUpgrade } from './scenarios/resume-serial.scenario.js'

/** The PREV_VERSION build → current with a saved card serial (4.0.3 and 4.1.x; the upgradePartial suite). Checkpoints: `scenarios/resume-serial.scenario.ts`. */
describe('Upgrade with a saved card serial', () => {
  defineResumeSerialUpgrade(prevBuildFromEnv())
})
