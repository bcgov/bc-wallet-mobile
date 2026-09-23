import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineNonBcscPartialUpgrade } from './scenarios/non-bcsc-partial.scenario.js'

/** Previous release → current with partial non-BCSC progress. Checkpoints: `scenarios/non-bcsc-partial.scenario.ts`. */
describe('Upgrade with partial non-BCSC progress', () => {
  defineNonBcscPartialUpgrade(currentPrevBuild)
})
