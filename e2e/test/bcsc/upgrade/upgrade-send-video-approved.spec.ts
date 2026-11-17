import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineSendVideoApprovedUpgrade } from './scenarios/send-video-approved.scenario.js'

/** The PREV_VERSION build → current with a send-video review approved while the app was closed (4.1.x only; the upgradeApproved suite, Android injection-off lane, queue drained first). Checkpoints: `scenarios/send-video-approved.scenario.ts`. */
describe('Upgrade with a send-video review approved while the app was closed', () => {
  defineSendVideoApprovedUpgrade(prevBuildFromEnv())
})
