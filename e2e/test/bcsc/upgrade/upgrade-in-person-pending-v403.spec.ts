import { v403PrevBuild } from '../../../src/flows/prev-build/v403.js'
import { defineInPersonPendingUpgrade } from './scenarios/in-person-pending.scenario.js'

/** The shipped 4.0.3 → current with an unapproved in-person request. Checkpoints: `scenarios/in-person-pending.scenario.ts`. */
describe('Upgrade from 4.0.3 with an unapproved in-person request', () => {
  defineInPersonPendingUpgrade(v403PrevBuild)
})
