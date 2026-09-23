import fs from 'fs'
import path from 'path'

import { testIdWithKey } from '@bifold/core'

import { TESTID_PREFIX, TestIds } from './registry'

describe('test ID registry', () => {
  // The registry stores bare keys and bifold applies the prefix, so a bifold upgrade that changes
  // `testIdPrefix` would make every e2e selector miss at runtime. Fail here instead.
  it('pins TESTID_PREFIX to bifold testIdPrefix', () => {
    expect(testIdWithKey('AnyKey')).toBe(`${TESTID_PREFIX}AnyKey`)
  })
})

/**
 * Registry keys with no `TestIds.<path>` reference anywhere in app source. Every one is here for a
 * reason, and the categories are the whole point of the list:
 *
 *   COMPOSED  the app emits the id through a shared component (a caller `id` plus `shared.field.*`),
 *             so the spelled-out form exists for specs to select by, not for a call site.
 *   ALIAS     the same id documented at a second mount; the shared component references one path.
 *   BIFOLD    an upstream call site this app does not own and cannot refactor.
 *   DERIVED   emitted from a translated label or server data, so no key can be passed at all.
 *
 * Anything else appearing here is drift: either a key was added with no consumer, or the app stopped
 * emitting one the e2e suite still compiles against. The list is exact in both directions — start
 * using a listed key and this fails too, which is the point.
 */
const KNOWN_UNREFERENCED = [
  'TestIds.onboarding.intro.settings',
  'TestIds.onboarding.createPin.pin1Visibility',
  'TestIds.onboarding.createPin.pin2Visibility',
  'TestIds.auth.accountLanding.settings',
  'TestIds.auth.enterPin.pinVisibility',
  'TestIds.verify.scanSerial.openSettings',
  'TestIds.verify.manualSerial.serialPressable',
  'TestIds.verify.manualSerial.serialInput',
  'TestIds.verify.manualSerial.serialSubtext',
  'TestIds.verify.enterBirthdate.birthdatePressable',
  'TestIds.verify.enterBirthdate.birthdateInput',
  'TestIds.verify.enterEmail.inputPressable',
  'TestIds.verify.enterEmail.input',
  'TestIds.verify.methodSelection.settingsMenu',
  'TestIds.verify.selfieCapture.takePhoto',
  'TestIds.verify.selfieCapture.cancel',
  'TestIds.verify.emailConfirmation.codeError',
  'TestIds.verify.additionalIdRequired.continue',
  'TestIds.verify.dualIdRequired.continue',
  'TestIds.verify.evidenceCapture.takePhoto',
  'TestIds.verify.evidenceCapture.cancel',
  'TestIds.verify.evidenceIdCollection.documentNumberPressable',
  'TestIds.verify.evidenceIdCollection.documentNumberInput',
  'TestIds.verify.evidenceIdCollection.lastName',
  'TestIds.verify.evidenceIdCollection.firstName',
  'TestIds.verify.evidenceIdCollection.middleNames',
  'TestIds.verify.evidenceIdCollection.birthdate',
  'TestIds.verify.evidenceIdCollection.birthdateSubtext',
  'TestIds.verify.residentialAddress.streetAddress1Pressable',
  'TestIds.verify.residentialAddress.streetAddress1Input',
  'TestIds.verify.residentialAddress.cityPressable',
  'TestIds.verify.residentialAddress.cityInput',
  'TestIds.verify.residentialAddress.postalCodePressable',
  'TestIds.verify.residentialAddress.postalCodeInput',
  'TestIds.verify.residentialAddress.provinceInput',
  'TestIds.verify.residentialAddress.provinceOptionBC',
  'TestIds.main.header.settings',
  'TestIds.main.verifyPrompt.continue',
  'TestIds.main.scanError.header',
  'TestIds.main.scanError.body',
  'TestIds.main.scanError.okay',
  'TestIds.main.appSecurity.choosePin',
  'TestIds.main.autoLock.time5',
  'TestIds.main.autoLock.time3',
  'TestIds.main.autoLock.time1',
  'TestIds.main.privacyPolicy.learnMore',
  'TestIds.main.editNickname.input',
  'TestIds.main.editNickname.pressable',
  'TestIds.main.editNickname.error',
  'TestIds.main.pairing.codeError',
  'TestIds.main.contactEditName.save',
  'TestIds.main.contactEditName.cancel',
  'TestIds.main.accountDetails.nicknameFieldEdit',
  'TestIds.main.accountDetails.addressFieldEdit',
  'TestIds.credential.offer.accept',
  'TestIds.credential.offer.decline',
  'TestIds.credential.offer.header',
  'TestIds.credential.offerAccept.onTheWay',
  'TestIds.credential.offerAccept.added',
  'TestIds.credential.offerAccept.done',
  'TestIds.credential.offerAccept.backToHome',
  'TestIds.credential.card.card',
  'TestIds.credential.card.name',
  'TestIds.credential.card.issuer',
  'TestIds.credential.card.revoked',
  'TestIds.credential.card.showDetails',
  'TestIds.credential.details.issuerName',
  'TestIds.credential.details.issuedDate',
  'TestIds.credential.details.revokedDate',
  'TestIds.credential.details.revocationMessage',
  'TestIds.credential.details.remove',
  'TestIds.credential.removeModal.confirm',
  'TestIds.credential.removeModal.cancel',
  'TestIds.credential.declineModal.confirm',
  'TestIds.credential.declineModal.cancel',
  'TestIds.proof.request.share',
  'TestIds.proof.request.decline',
  'TestIds.proof.request.cancel',
  'TestIds.proof.request.loading',
  'TestIds.proof.accept.sending',
  'TestIds.proof.accept.sent',
  'TestIds.proof.accept.backToHome',
  'TestIds.developer.environment',
  'TestIds.bcwallet.onboarding.next',
  'TestIds.bcwallet.onboarding.back',
]

const SRC = path.join(__dirname, '..')

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) {
      // Skip node_modules and every Jest-convention `__x__` directory — tests, snapshots, mocks,
      // fixtures. A reference from test-only code must not satisfy this ratchet, and matching the
      // whole convention avoids extending a denylist each time one of them appears.
      return entry === 'node_modules' || /^__.*__$/.test(entry) ? [] : sourceFiles(full)
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : []
  })

const leafPaths = (node: object, prefix: string[] = []): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string' ? [`TestIds.${[...prefix, key].join('.')}`] : leafPaths(value as object, [...prefix, key])
  )

describe('test ID registry coverage', () => {
  it('every key is referenced by app code, or listed as deliberately unreferenced', () => {
    const source = sourceFiles(SRC)
      .filter((f) => !f.endsWith(path.join('test-ids', 'registry.ts')))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n')
    const referenced = new Set(source.match(/TestIds(?:\.[A-Za-z0-9_$]+)+/g) ?? [])

    expect(leafPaths(TestIds).filter((p) => !referenced.has(p))).toEqual(KNOWN_UNREFERENCED)
  })
})
