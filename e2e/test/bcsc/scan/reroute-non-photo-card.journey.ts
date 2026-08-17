import { TestUsers } from '../../../src/constants.js'
import { presentBcscCardAsEvidence } from '../../../src/flows/verify.js'
import { canInjectCardBarcodes } from '../../../src/helpers/camera.js'
import { expectRerouteIntoIdStep, reachFirstIdCapture } from './reroute-context.js'

/**
 * Scan journey: a NON-PHOTO card photographed as the first non-BCSC ID reroutes into its own setup.
 *
 * The card type where the reroute visibly differs. A non-photo card carries no photo of its holder, so
 * its serial does not finish the ID step the way a photo or combined card's does — the app still owes
 * a photo document. The reroute therefore lands back INSIDE the ID step rather than at the method
 * choice, which is the whole reason this card type is worth its own run.
 *
 * ANDROID + SAUCE ONLY, one-way per session — see the photo-card journey for why.
 */
describe('Scan journey: non-BCSC reroutes to a non-photo card', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
  })

  it('reaches the first non-BCSC document capture', async () => {
    await reachFirstIdCapture()
  })

  it('reroutes back into the ID step when the photographed ID is a real non-photo card', async () => {
    await presentBcscCardAsEvidence(TestUsers.nonPhoto.cardScanTarget)
    await expectRerouteIntoIdStep()
  })
})
