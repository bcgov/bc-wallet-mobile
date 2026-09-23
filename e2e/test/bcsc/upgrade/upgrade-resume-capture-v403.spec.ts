import { v403PrevBuild } from '../../../src/flows/prev-build/v403.js'
import { defineResumeCaptureUpgrade } from './scenarios/resume-capture.scenario.js'

/** The shipped 4.0.3 → current with a document captured but not yet numbered. Checkpoints: `scenarios/resume-capture.scenario.ts`. */
describe('Upgrade from 4.0.3 with a captured document awaiting its number', () => {
  defineResumeCaptureUpgrade(v403PrevBuild)
})
