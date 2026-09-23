import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineInPersonPendingUpgrade } from './scenarios/in-person-pending.scenario.js'

/** Previous release → current with an unapproved in-person request. Checkpoints: `scenarios/in-person-pending.scenario.ts`. */
describe('Upgrade with an unapproved in-person request', () => {
  defineInPersonPendingUpgrade(currentPrevBuild)
})
