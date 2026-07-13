import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, initialState } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { getResumeStepRoute } from './resume-step-route'

describe('getResumeStepRoute', () => {
  it('routes to the account-setup question when the setup type has not been chosen yet', () => {
    const store = structuredClone(initialState)
    // No accountSetupType, not verified, no video submitted → ask how to set up first.
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.AccountSetup)
  })

  it('routes a transfer user to the QR transfer instructions, skipping verification steps', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.TransferAccount
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.TransferAccountInstructions)
  })

  it('routes a new-account user to identity selection', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.IdentitySelection)
  })

  it('routes a verified user to the success screen regardless of setup type', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.TransferAccount
    store.bcscSecure.verified = true
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.VerificationSuccess)
  })

  it('resumes a user with verification progress but no recorded setup type instead of bouncing to the setup question', () => {
    const store = structuredClone(initialState)
    // ID already registered (photo card + serial) but accountSetupType was never recorded — e.g.
    // migrated from a build that predates the field. Resume at the next step, don't lose progress.
    store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
    store.bcscSecure.serial = '123456789'
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.ResidentialAddress)
  })

  it('resumes to the birthdate screen when a serial was entered but the device is not yet authorized', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    // Serial saved (manual entry or single-barcode scan) but the user left before completing the
    // birthdate → device-authorization step: no deviceCode, no cardProcess yet. Resume on the
    // birthdate screen instead of the start of the ID step so the serial isn't discarded.
    store.bcscSecure.serial = '123456789'
    expect(getResumeStepRoute(store).name).toBe(BCSCScreens.EnterBirthdate)
  })

  it('does not route to the birthdate screen for a Non-BCSC evidence flow that carries a stale serial', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    // A serial can be left behind by a failed combo-card scan while capturing evidence in the
    // Non-BCSC flow. cardProcess is set, so this must stay in the evidence flow, not jump to birthdate.
    store.bcscSecure.serial = '123456789'
    store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC
    expect(getResumeStepRoute(store).name).not.toBe(BCSCScreens.EnterBirthdate)
  })

  it('resumes an in-progress evidence (photos captured, document number pending) back to EvidenceIDCollection', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC
    // User captured the required photo for this ID but left before entering the document
    // number (app locked while on EvidenceIDCollection). Resume there rather than sending them
    // back to the start, where EvidenceTypeList's cleanup would discard the captured photo.
    store.bcscSecure.additionalEvidenceData = [
      {
        evidenceType: { evidence_type: 'passport', image_sides: [{}] },
        metadata: ['photo-front'],
      },
    ] as any

    const route = getResumeStepRoute(store)
    expect(route.name).toBe(BCSCScreens.EvidenceIDCollection)
    expect((route.params as { cardType: { evidence_type: string } }).cardType.evidence_type).toBe('passport')
  })

  it('resumes an interrupted capture to IDPhotoInformation to restart, not the document form', () => {
    const store = structuredClone(initialState)
    store.bcsc.accountSetupType = AccountSetupType.AddAccount
    store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC
    // A two-sided ID that was selected but whose capture wasn't finished (the user left between the
    // front and back). Mid-capture photos aren't committed, so the entry has no photos; resume to
    // IDPhotoInformation to restart capture from the first side rather than jumping to the
    // document-number screen or bouncing to the start of the ID flow.
    store.bcscSecure.additionalEvidenceData = [
      {
        evidenceType: { evidence_type: 'drivers_licence', image_sides: [{}, {}] },
        metadata: [],
      },
    ] as any

    const route = getResumeStepRoute(store)
    expect(route.name).toBe(BCSCScreens.IDPhotoInformation)
    expect((route.params as { cardType: { evidence_type: string } }).cardType.evidence_type).toBe('drivers_licence')
  })
})
