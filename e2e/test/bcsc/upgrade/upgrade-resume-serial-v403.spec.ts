import { v403PrevBuild } from '../../../src/flows/prev-build/v403.js'
import { defineResumeSerialUpgrade } from './scenarios/resume-serial.scenario.js'

/** The shipped 4.0.3 → current with a saved card serial. Checkpoints: `scenarios/resume-serial.scenario.ts`. */
describe('Upgrade from 4.0.3 with a saved card serial', () => {
  defineResumeSerialUpgrade(v403PrevBuild)
})
