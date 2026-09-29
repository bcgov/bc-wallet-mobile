import { v403PrevBuild } from '../../../src/flows/prev-build/v403.js'
import { defineVerifiedUpgrade } from './scenarios/verified.scenario.js'

/** The shipped 4.0.3 → current with a verified account. Checkpoints: `scenarios/verified.scenario.ts`. */
describe('Upgrade from 4.0.3 with a verified account', () => {
  defineVerifiedUpgrade(v403PrevBuild)
})
