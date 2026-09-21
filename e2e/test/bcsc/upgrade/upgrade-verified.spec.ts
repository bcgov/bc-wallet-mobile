import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineVerifiedUpgrade } from './scenarios/verified.scenario.js'

/** Previous release → current with a verified account. Checkpoints: `scenarios/verified.scenario.ts`. */
describe('Upgrade with a verified account', () => {
  defineVerifiedUpgrade(currentPrevBuild)
})
