import { currentPrevBuild } from '../../../src/flows/prev-build/current.js'
import { defineSendVideoPendingUpgrade } from './scenarios/send-video-pending.scenario.js'

/**
 * Previous release → current with a pending send-video review. Runs in the serial `upgradeSendVideo`
 * suite (Android injection-off lane, queue drained first). Checkpoints: `scenarios/send-video-pending.scenario.ts`.
 */
describe('Upgrade with a pending send-video review', () => {
  defineSendVideoPendingUpgrade(currentPrevBuild)
})
