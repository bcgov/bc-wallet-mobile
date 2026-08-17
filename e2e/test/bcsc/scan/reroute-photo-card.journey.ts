import { TestUsers } from '../../../src/constants.js'
import { presentBcscCardAsEvidence } from '../../../src/flows/verify.js'
import { canInjectCardBarcodes } from '../../../src/helpers/camera.js'
import { expectRerouteToMethodSelection, reachFirstIdCapture } from './reroute-context.js'

/**
 * Scan journey: a PHOTO card photographed as the first non-BCSC ID reroutes into its own setup.
 *
 * The user says they have no BC Services Card, then photographs one anyway. The scanner behind the
 * evidence shutter reads its serial and AAMVA barcodes, UsePhoto asks `/device/barcodes`, the backend
 * recognises the card, and the app abandons the two-ID flow for that card's own — the "re-route to
 * BCSC on first ID" behaviour, and the strongest end-to-end proof that Android reads card barcodes
 * off an injected frame at all (decode → decoder strategy → backend → navigation).
 *
 * ANDROID + SAUCE ONLY: iOS decodes in the OS and Sauce synthesizes QR metadata only, so no injected
 * image can ever fire the 1D/PDF-417 scan this depends on. Skipped everywhere else.
 *
 * One-way and one-per-session: the reroute authorizes this device against the scanned card, which is
 * why each card type gets its own file (and so its own fully-reset install).
 */
describe('Scan journey: non-BCSC reroutes to a photo card', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
  })

  it('reaches the first non-BCSC document capture', async () => {
    await reachFirstIdCapture()
  })

  it('reroutes to the method choice when the photographed ID is a real photo card', async () => {
    await presentBcscCardAsEvidence(TestUsers.photo.cardScanTarget)
    // A photo card's serial completes the ID step on its own, so the reroute skips the rest of the
    // two-ID flow entirely — no second document, no address, no email.
    await expectRerouteToMethodSelection()
  })
})
