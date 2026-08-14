import { TestUsers } from '../../../src/constants.js'
import { presentBcscCardAsEvidence } from '../../../src/flows/verify.js'
import { canInjectCardBarcodes } from '../../../src/helpers/camera.js'
import { expectRerouteToMethodSelection, reachFirstIdCapture } from './reroute-context.js'

/**
 * Scan journey: a COMBINED card photographed as the first non-BCSC ID reroutes into its own setup.
 *
 * Same mechanism as the photo-card journey, against a different SIT account. The app-side landing is
 * identical on purpose — combined and photo both resolve to `BCSCCardProcess.BCSCPhoto`, so the resume
 * logic cannot tell them apart — and what this run adds is that the BACKEND matches a combined card's
 * barcodes to its own account. A combined card is also the realistic case: it is the card that
 * genuinely carries both a driver's licence PDF-417 and a BCSC serial.
 *
 * ANDROID + SAUCE ONLY, one-way per session — see the photo-card journey for why.
 */
describe('Scan journey: non-BCSC reroutes to a combined card', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
  })

  it('reaches the first non-BCSC document capture', async () => {
    await reachFirstIdCapture()
  })

  it('reroutes to the method choice when the photographed ID is a real combined card', async () => {
    await presentBcscCardAsEvidence(TestUsers.combined.cardScanTarget)
    await expectRerouteToMethodSelection()
  })
})
