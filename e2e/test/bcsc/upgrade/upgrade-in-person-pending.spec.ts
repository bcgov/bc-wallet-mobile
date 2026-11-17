import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineInPersonPendingUpgrade } from './scenarios/in-person-pending.scenario.js'

/** The PREV_VERSION build → current with an unapproved in-person request (every lineage; the upgradeSubmitted suite). Checkpoints: `scenarios/in-person-pending.scenario.ts`. */
describe('Upgrade with an unapproved in-person request', () => {
  defineInPersonPendingUpgrade(prevBuildFromEnv())
})
