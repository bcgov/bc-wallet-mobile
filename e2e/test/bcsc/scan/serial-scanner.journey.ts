import { Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  expectDualIdentificationRequired,
  openSerialScanner,
  startVerification,
} from '../../../src/flows/verify.js'
import { canInjectCardBarcodes, injectCode39 } from '../../../src/helpers/camera.js'

/**
 * Scan journey: the card-serial scanner, driven by a barcode that is not a BC Services Card.
 *
 * The generic Android barcode-scanning checkpoint, and the only one that exercises the SERIAL screen —
 * the app's second scanner surface, distinct from the evidence-capture one the reroute journeys use.
 * It has its own camera configuration (2× zoom, a multi-reading lock) and its own decoder path, so a
 * green evidence-capture scan says nothing about it.
 *
 * A digits-only code is the right payload: it decodes cleanly yet matches no BCSC serial shape
 * (`letters then digits`) and no AAMVA licence, so every decoder declines it and the app treats the
 * scan as "this is not a BC Services Card" — routing to the two-government-ID flow. That outcome is
 * stable whether or not the app later stops reacting to value-less partial detections, which a real
 * card's barcodes would trip first.
 *
 * ANDROID + SAUCE ONLY: iOS decodes in the OS from metadata Sauce synthesizes for QR alone, so an
 * injected 1D code can never fire there.
 *
 * ONE CHECKPOINT PER SESSION: the resulting non-BCSC card process survives "Restart verification", so
 * nothing after this can scan again.
 */

/**
 * Digits only — no letter prefix, so it fails `isBCSCSerial` and is not a serial; not AAMVA either.
 * Decodable on purpose: an UNdecodable code proves only that something was detected.
 */
const NON_SERIAL_BARCODE = '123456789'

describe('Scan journey: unrecognised barcode at the serial scanner', () => {
  before(function () {
    if (!canInjectCardBarcodes()) {
      return this.skip()
    }
  })

  it('onboards and opens the serial scanner', async () => {
    await completeOnboarding()
    await startVerification()
    await chooseAddAccount()
    await openSerialScanner()
  })

  it('routes to the two-ID flow when the scanned code is not a BC Services Card', async () => {
    // Injected AFTER the scanner is up, reversing the usual inject-first rule: the non-BCSC branch
    // fires on the FIRST decoded frame, so a code already in the feed navigates away before
    // `openSerialScanner` can ever see the screen. A torn transition frame lands here too — it decodes
    // to no value, which is what the branch keys on — so the assertion holds either way.
    await injectCode39(NON_SERIAL_BARCODE)
    // Generous: one clean decode through the 2× zoom can take a while.
    await expectDualIdentificationRequired(Timeouts.CARD_SCAN)
  })
})
