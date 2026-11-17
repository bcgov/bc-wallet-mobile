import { prevBuildFromEnv } from '../../../src/flows/prev-build/index.js'
import { defineSendVideoPendingUpgrade } from './scenarios/send-video-pending.scenario.js'

/** The PREV_VERSION build → current with a pending send-video review (4.1.x only; the upgradeSubmitted suite, Android injection-off lane, queue drained first). Checkpoints: `scenarios/send-video-pending.scenario.ts`. */
describe('Upgrade with a pending send-video review', () => {
  defineSendVideoPendingUpgrade(prevBuildFromEnv())
})
