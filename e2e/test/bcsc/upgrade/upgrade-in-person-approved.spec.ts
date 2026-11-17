import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineInPersonApprovedUpgrade } from './scenarios/in-person-approved.scenario.js'

/** The PREV_VERSION build → current with an in-person request approved while the app was closed (every lineage; the upgradeApproved suite). Checkpoints: `scenarios/in-person-approved.scenario.ts`. */
describe('Upgrade with an in-person request approved while the app was closed', () => {
  defineInPersonApprovedUpgrade(prevBuildFromEnv())
})
