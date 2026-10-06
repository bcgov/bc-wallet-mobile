import { TestUsers, Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  openSerialScanner,
  reachVerificationMethod,
  startVerification,
} from '../../../src/flows/verify.js'
import { canInjectCardBarcodes, injectScanTarget } from '../../../src/helpers/camera.js'
import { EnterEmailScreen, VerificationMethodSelectionScreen } from '../../../src/screens/verify.js'

/**
 * Scan journey: the card-serial scanner, driven by a real BC Services Card scan.
 *
 * The generic Android barcode-scanning checkpoint, and the only one that exercises the SERIAL screen —
 * the app's second scanner surface, distinct from the evidence-capture one the reroute journeys use.
 * It has its own camera configuration (2× zoom, a multi-reading lock) and its own decoder path, so a
 * green evidence-capture scan says nothing about it.
 *
 * The injected card carries the persona's own serial (code-39) and birthdate (PDF-417). Once the screen
 * has read both it asks `/device/barcodes`, which matches the card and authorizes the device, so the
 * app lands in setup. The card is injected before the scanner opens, the usual rule: swapping an image
 * into a live camera leaves transition frames carrying only part of it. A failed or partial read keeps
 * scanning rather than leaving the screen, so such a frame no longer sends the app elsewhere.
 *
 * Not covered here: a stray or unrecognised code (keeps scanning) and a card the server does not match
 * (`card_not_found` → the other-ID flow). The unit tests carry those; this journey is the happy path.
 *
 * ANDROID + SAUCE ONLY: iOS decodes in the OS from metadata Sauce synthesizes for QR alone, so an
 * injected 1D code can never fire there.
 *
 * ONE CHECKPOINT PER SESSION: the scan authorizes the device against the persona's card, so nothing
 * after this in the same session should scan again.
 */
describe('Scan journey: a BC Services Card at the serial scanner', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
  })

  it('onboards and opens the serial scanner on a card', async () => {
    await completeOnboarding()
    await startVerification()
    await chooseAddAccount()
    await injectScanTarget(TestUsers.combined.cardScanTarget)
    await openSerialScanner()
  })

  it('authorizes the scanned card and continues to setup', async () => {
    // Generous: both codes must decode through the 2× zoom, then the backend round trip.
    const deadline = Date.now() + Timeouts.CARD_SCAN
    while (
      !(await VerificationMethodSelectionScreen.isVisible('inPerson')) &&
      !(await EnterEmailScreen.isPresent(500))
    ) {
      if (Date.now() > deadline) {
        throw new Error(`The scanned card did not continue to setup within ${Timeouts.CARD_SCAN / 1000}s`)
      }
    }

    await reachVerificationMethod()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
