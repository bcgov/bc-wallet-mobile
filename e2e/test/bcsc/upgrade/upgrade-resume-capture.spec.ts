import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineResumeCaptureUpgrade } from './scenarios/resume-capture.scenario.js'

/** Previous release → current with a document captured but not yet numbered. Checkpoints: `scenarios/resume-capture.scenario.ts`. */
describe('Upgrade with a captured document awaiting its number', () => {
  defineResumeCaptureUpgrade(currentPrevBuild)
})
