import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineVerifiedUpgrade } from './scenarios/verified.scenario.js'

/** The PREV_VERSION build → current with a verified account (every lineage; the upgradeVerified suite). Checkpoints: `scenarios/verified.scenario.ts`. */
describe('Upgrade with a verified account', () => {
  defineVerifiedUpgrade(prevBuildFromEnv())
})
