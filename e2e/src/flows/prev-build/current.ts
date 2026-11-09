import { TEST_PIN, TestUsers, Timeouts } from '../../constants.js'
import { getEmailConfirmationCode } from '../../helpers/email.js'
import { VerificationMethodSelectionScreen } from '../../screens/verify.js'
import { completeOnboarding } from '../onboarding.js'
import {
  approveInPersonAndComplete,
  captureFirstNonBcscDocument,
  captureSecondNonBcscDocument,
  chooseAddAccount,
  completeEmailVerification,
  enterBirthdate,
  enterSerialManually,
  fillResidentialAddress,
  reachInPersonConfirmationCode,
  reachVerificationMethod,
  startEmailVerification,
  startVerification,
  submitEmailCode,
  submitEvidenceIdCollection,
  submitSendVideoVerification,
} from '../verify.js'
import type { PrevBuild } from './types.js'

/**
 * Any shipped 4.1.0-or-later build (`BCSC-v4.1.x.*`): today's onboarding + verify DSL drives it as-is.
 * A release that renames a verify testID or reshapes onboarding surfaces here as a phase-1 failure —
 * upgrade signal, not flake. The label is the default; `prevBuildFromEnv` sets the version booted.
 */
export const currentPrevBuild: PrevBuild = {
  label: '4.1.x',
  pin: TEST_PIN,
  bcscUser: TestUsers.photo,
  nonBcscUser: TestUsers.na,
  nonBcscDocs: { first: 'BC Drivers Licence', second: 'Canadian Passport' },

  onboard: (pin) => completeOnboarding(pin),

  async authorize(user) {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(user)
    await enterBirthdate(user)
    await reachVerificationMethod()
  },

  showInPersonCode: reachInPersonConfirmationCode,
  approveAndComplete: approveInPersonAndComplete,

  async enterSerial(user) {
    await startVerification()
    await chooseAddAccount()
    await enterSerialManually(user) // ends ON EnterBirthdate
  },

  submitSendVideo: submitSendVideoVerification,

  async captureFirstDocumentOnly(user, docMatch) {
    await startVerification()
    await chooseAddAccount()
    await captureFirstNonBcscDocument(user, docMatch) // ends ON EvidenceIDCollection
  },

  async arrangeNonBcscPartial(user, docs) {
    await startVerification()
    await chooseAddAccount()
    await captureFirstNonBcscDocument(user, docs.first)
    await submitEvidenceIdCollection(user.primaryDocumentNumber, {
      lastName: user.lastName,
      firstName: user.firstName,
      dob: user.dob,
    })
    await captureSecondNonBcscDocument(user, docs.second)
    await submitEvidenceIdCollection(user.documentNumber)
    await fillResidentialAddress()
    // Mandatory here — a cardless registration has no card-supplied email and no Skip.
    const token = await startEmailVerification()
    await submitEmailCode(await getEmailConfirmationCode(token))
    await completeEmailVerification()
    await VerificationMethodSelectionScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  },
}
