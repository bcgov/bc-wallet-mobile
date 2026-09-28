import { v3PrevBuild } from '../../../src/flows/prev-build/v3.js'
import { defineInPersonPendingUpgrade } from './scenarios/in-person-pending.scenario.js'

/**
 * The legacy v3 app → current with an unapproved in-person request — the one in-progress state v3 can
 * arrange. The v3 request hydrates from v3's own storage (no v4 blob exists yet), so the post-swap
 * resume goes VerifyPrompt → Skip → Home card; where that lands is the finding this proves.
 * Checkpoints: `scenarios/in-person-pending.scenario.ts`.
 */
describe('Upgrade from v3 with an unapproved in-person request', () => {
  defineInPersonPendingUpgrade(v3PrevBuild)
})
