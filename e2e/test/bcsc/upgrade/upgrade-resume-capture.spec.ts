import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineResumeCaptureUpgrade } from './scenarios/resume-capture.scenario.js'

/** The PREV_VERSION build → current with a document captured but not yet numbered (4.0.3 and 4.1.x; the upgradePartial suite). Checkpoints: `scenarios/resume-capture.scenario.ts`. */
describe('Upgrade with a captured document awaiting its number', () => {
  defineResumeCaptureUpgrade(prevBuildFromEnv())
})
