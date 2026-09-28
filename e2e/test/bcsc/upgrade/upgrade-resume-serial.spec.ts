import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineResumeSerialUpgrade } from './scenarios/resume-serial.scenario.js'

/** Previous release → current with a saved card serial. Checkpoints: `scenarios/resume-serial.scenario.ts`. */
describe('Upgrade with a saved card serial', () => {
  defineResumeSerialUpgrade(currentPrevBuild)
})
