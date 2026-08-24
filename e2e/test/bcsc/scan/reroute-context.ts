import { Timeouts } from '../../../src/constants.js'
import { completeOnboarding } from '../../../src/flows/onboarding.js'
import {
  chooseAddAccount,
  chooseOtherIdPath,
  expectEvidenceReroute,
  isAdditionalIdentificationRequired,
  reachVerificationMethod,
  selectEvidenceType,
  startVerification,
} from '../../../src/flows/verify.js'
import {
  EnterEmailScreen,
  IDPhotoInformationScreen,
  VerificationMethodSelectionScreen,
} from '../../../src/screens/verify.js'

/**
 * Shared arrange + landings for the non-BCSC → BCSC reroute journeys.
 *
 * Each journey is its own file because a reroute is irreversible: it authorizes the device against the
 * scanned card and rewrites the card process, and `fullReset` gives every spec file a fresh install.
 * Only the persona and the landing differ, so both live here.
 *
 * The cards come from `assets/images/scan/`, NOT the shared `dl_*.jpg` template — every copy of that
 * template carries the same baked-in barcode (daphne's C26444539), so it could only ever reroute to one
 * persona. The generated cards carry each persona's real serial, name and birthdate, but a synthetic
 * licence number, address and expiry, and `/device/barcodes` is sent all of those. If SIT turns out to
 * match on a field we invent, the reroute will not fire and `expectEvidenceReroute` will report the
 * card as "captured as ordinary evidence" — the fix is to put each persona's real licence data in the
 * generator, not to change these journeys.
 */

/**
 * The first-slot ID these journeys claim to be photographing. A combo card IS a driver's licence, so
 * this is the honest choice — and it is the two-sided type, which makes the fall-through case (no
 * reroute → a second side) distinguishable from the reroute.
 */
export const FIRST_DOC_MATCH = 'BC Drivers Licence'

/** Onboard and walk to the first ID's capture prompt, the screen `presentBcscCardAsEvidence` starts on. */
export async function reachFirstIdCapture(): Promise<void> {
  await completeOnboarding()
  await startVerification()
  await chooseAddAccount()
  await chooseOtherIdPath()
  await selectEvidenceType(FIRST_DOC_MATCH)
}

/**
 * Landing for a card whose serial ALONE completes the ID step — photo and combined (both map to
 * `BCSCCardProcess.BCSCPhoto`), and non-photo once a photo ID is already on file.
 *
 * The ID step closes, the authorize response supplies the address and a verified email, and the user
 * arrives at the method choice. `reachVerificationMethod` tolerates the email screen for a card that
 * carried none — no SIT card does today, but the branch exists.
 */
export async function expectRerouteToMethodSelection(): Promise<void> {
  await expectEvidenceReroute(
    async () =>
      (await VerificationMethodSelectionScreen.isVisible('inPerson')) || (await EnterEmailScreen.isPresent(500))
  )
  await reachVerificationMethod()
  await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
}

/**
 * Landing for a non-photo card with no photo ID yet: the serial is accepted but the ID step still owes
 * a photo document, so the reroute lands back inside it rather than at the method choice.
 *
 * Either screen counts. The app computes the resume route from a store snapshot that still holds the
 * interrupted evidence and clears it immediately AFTER navigating — with the record present the route
 * is IDPhotoInformation (restart that capture), without it AdditionalIdentificationRequired (pick a
 * photo ID). Pinning one would pin that ordering rather than the reroute this journey is about.
 */
export async function expectRerouteIntoIdStep(): Promise<void> {
  await expectEvidenceReroute(
    async () => (await IDPhotoInformationScreen.isPresent(500)) || (await isAdditionalIdentificationRequired())
  )
}
