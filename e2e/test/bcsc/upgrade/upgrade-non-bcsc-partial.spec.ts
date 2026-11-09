import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineNonBcscPartialUpgrade } from './scenarios/non-bcsc-partial.scenario.js'

/** The PREV_VERSION build → current with partial non-BCSC progress (4.1.x only; the upgradePartial suite). Checkpoints: `scenarios/non-bcsc-partial.scenario.ts`. */
describe('Upgrade with partial non-BCSC progress', () => {
  defineNonBcscPartialUpgrade(prevBuildFromEnv())
})
