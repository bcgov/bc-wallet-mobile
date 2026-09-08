import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { AccountSetupType, BCSCSecureState, BCState, initialState } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'

// structuredClone, not a spread: `{ ...initialState }` clones only the top level, so nested
// bcsc/bcscSecure objects would stay shared references and leak between tests.
const makeStore = (bcscSecure: Partial<BCSCSecureState> = {}): BCState => {
  const store = structuredClone(initialState)
  Object.assign(store.bcscSecure, bcscSecure)
  return store
}

/** A nickname is the precondition for every step past the very beginning of setup. */
const makeNamedStore = (bcscSecure: Partial<BCSCSecureState> = {}): BCState => {
  const store = makeStore(bcscSecure)
  store.bcsc.selectedNickname = 'test'
  return store
}

const ID_COMPLETE: Partial<BCSCSecureState> = {
  cardProcess: BCSCCardProcess.BCSCPhoto,
  serial: '123456789',
  emailAddress: 'steveBrule@email.com',
}

const ADDRESS_COMPLETE: Partial<BCSCSecureState> = { ...ID_COMPLETE, deviceCode: 'ABCDEFGH' }

const EMAIL_COMPLETE: Partial<BCSCSecureState> = { ...ADDRESS_COMPLETE, isEmailVerified: true }

describe('computeSetupStepCompletion', () => {
  describe('Init', () => {
    it('all steps should not be focused and completed', () => {
      const store = makeStore()

      const result = computeSetupStepCompletion(store)

      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.address.completed).toBe(false)
      expect(result.address.focused).toBe(false)
      expect(result.email.completed).toBe(false)
      expect(result.email.focused).toBe(false)
      expect(result.verify.completed).toBe(false)
      expect(result.verify.focused).toBe(false)
    })
  })

  describe('ID Step', () => {
    it('Combo Card: should be completed when serial and email provided', () => {
      const store = makeNamedStore()

      expect(computeSetupStepCompletion(store).id.completed).toBe(false)
      expect(computeSetupStepCompletion(store).id.focused).toBe(true)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'

      const result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)
    })

    it('NonPhoto Card: should not show needs additional card when only cardType is set (user backed out before serial)', () => {
      // Note: serial is NOT set - simulates user selecting card type but backing out
      const store = makeNamedStore({ cardProcess: BCSCCardProcess.BCSCNonPhoto })

      const result = computeSetupStepCompletion(store)

      // Should NOT show "needs additional card" because user hasn't even entered the serial yet
      expect(result.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
    })

    it('Other Card: should not show needs additional card when only cardType is set (user backed out before evidence)', () => {
      // Note: no evidence data - simulates user selecting card type but backing out
      const store = makeNamedStore({ cardProcess: BCSCCardProcess.NonBCSC })

      const result = computeSetupStepCompletion(store)

      // Should NOT show "needs additional card" because user hasn't even submitted their first ID yet
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(false)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
    })

    it('Non-Photo Card: should be completed when serial, email, and photo ID provided', () => {
      const store = makeNamedStore()

      let result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.id.nonPhotoBcscNeedsAdditionalCard).toBe(true)

      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: true,
          },
          metadata: [{ uri: 'photo1.jpg' }], // At least 1 photo required
          documentNumber: 'DL123456', // Document number required
        },
      ] as any[]

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)
      expect(result.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
    })

    it('Non-BCSC Card: should be completed when 2 IDs provided', () => {
      const store = makeNamedStore()

      let result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: false,
          },
          metadata: [{ uri: 'photo1.jpg' }],
          documentNumber: 'PASS123456',
        },
      ] as any[]

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(true)

      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: false,
          },
          metadata: [{ uri: 'photo1.jpg' }],
          documentNumber: 'PASS123456',
        },
        {
          evidenceType: {
            has_photo: true,
          },
          metadata: [{ uri: 'photo2.jpg' }],
          documentNumber: 'DL789012',
        },
      ] as any[]

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(false)
    })
  })

  describe('Residential Address Step', () => {
    it('should be focused when ID step completed but address not yet completed', () => {
      const store = makeNamedStore(ID_COMPLETE)

      const result = computeSetupStepCompletion(store)

      expect(result.address.focused).toBe(true)
      expect(result.address.completed).toBe(false)
    })

    it('should be completed when device code is provided', () => {
      const store = makeNamedStore(ADDRESS_COMPLETE)

      const result = computeSetupStepCompletion(store)

      expect(result.address.focused).toBe(false)
      expect(result.address.completed).toBe(true)
    })
  })

  describe('Email Step', () => {
    it('should be focused when ID step completed, address step completed, but email not yet completed', () => {
      const store = makeNamedStore(ADDRESS_COMPLETE)

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should be focused when BCSC card (Photo/NonPhoto) has serial but no email after completing ID and address steps', () => {
      const store = makeNamedStore({ ...ADDRESS_COMPLETE, emailAddress: undefined })

      const result = computeSetupStepCompletion(store)

      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)

      expect(result.address.completed).toBe(true)
      expect(result.address.focused).toBe(false)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)

      expect(result.verify.focused).toBe(false)
      expect(result.verify.completed).toBe(false)
    })

    it('should be focused with NonPhoto card type when serial available but email is falsey', () => {
      const store = makeNamedStore({
        ...ADDRESS_COMPLETE,
        cardProcess: BCSCCardProcess.BCSCNonPhoto,
        emailAddress: '',
        additionalEvidenceData: [
          {
            evidenceType: { has_photo: true },
            metadata: [{ uri: 'photo1.jpg' }],
            documentNumber: 'DL123456',
          },
        ] as any[],
      })

      const result = computeSetupStepCompletion(store)

      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)

      expect(result.address.completed).toBe(true)
      expect(result.address.focused).toBe(false)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should not be completed when email is provided but emailConfirmed is false', () => {
      const store = makeNamedStore({ ...ADDRESS_COMPLETE, isEmailVerified: false })

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should not be completed when emailConfirmed is true but email is missing', () => {
      const store = makeNamedStore({ ...EMAIL_COMPLETE, emailAddress: undefined })

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should be completed when both email and emailConfirmed are true (email may be set to BCSC_EMAIL_NOT_PROVIDED)', () => {
      const store = makeNamedStore(EMAIL_COMPLETE)

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(false)
      expect(result.email.completed).toBe(true)
    })

    it('should be completed when user skipped email (userSkippedEmailVerification=true, no emailAddress — v3 migration case)', () => {
      const store = makeNamedStore({
        ...ADDRESS_COMPLETE,
        emailAddress: undefined,
        isEmailVerified: false,
        userSkippedEmailVerification: true,
      })

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(false)
      expect(result.email.completed).toBe(true)
    })

    it('should not be completed when email entered but not verified, even if userSkippedEmailVerification was previously set', () => {
      const store = makeNamedStore({ ...ADDRESS_COMPLETE, isEmailVerified: false, userSkippedEmailVerification: false })

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })
  })

  describe('Verify Step', () => {
    it('should be focused when ID step completed, address step completed, email step completed, but verify not yet completed', () => {
      const store = makeNamedStore({ ...EMAIL_COMPLETE, verified: false })

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(false)
    })

    it('should be completed when verified is true', () => {
      const store = makeNamedStore({ ...EMAIL_COMPLETE, verified: true, userSubmittedVerificationVideo: false })

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(true)
    })

    it('should be completed when userSubmittedVerificationVideo is true', () => {
      const store = makeNamedStore({ ...EMAIL_COMPLETE, verified: false, userSubmittedVerificationVideo: true })

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(true)
    })
  })

  describe('Full workflow', () => {
    it('should progress through all steps to completion', () => {
      const store = makeStore()

      let result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.address.completed).toBe(false)
      expect(result.address.focused).toBe(false)
      expect(result.email.completed).toBe(false)
      expect(result.email.focused).toBe(false)
      expect(result.verify.completed).toBe(false)
      expect(result.verify.focused).toBe(false)

      store.bcsc.selectedNickname = 'test'

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'

      result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)
      expect(result.address.completed).toBe(false)
      expect(result.address.focused).toBe(true)

      store.bcscSecure.deviceCode = 'ABCDEFGH'

      result = computeSetupStepCompletion(store)
      expect(result.address.completed).toBe(true)
      expect(result.address.focused).toBe(false)
      expect(result.email.completed).toBe(false)
      expect(result.email.focused).toBe(true)

      store.bcscSecure.isEmailVerified = true

      result = computeSetupStepCompletion(store)
      expect(result.email.completed).toBe(true)
      expect(result.email.focused).toBe(false)
      expect(result.verify.completed).toBe(false)
      expect(result.verify.focused).toBe(true)

      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false

      result = computeSetupStepCompletion(store)
      expect(result.verify.completed).toBe(true)
      expect(result.verify.focused).toBe(true)
    })
  })

  describe('currentStep property', () => {
    it('should return id when id step is focused', () => {
      const store = makeNamedStore()
      expect(computeSetupStepCompletion(store).currentStep).toBe('id')
    })

    it('should return address when address step is focused', () => {
      const store = makeNamedStore({ cardProcess: BCSCCardProcess.BCSCPhoto, serial: '123456789' })
      expect(computeSetupStepCompletion(store).currentStep).toBe('address')
    })

    it('should return email when email step is focused', () => {
      const store = makeNamedStore({
        cardProcess: BCSCCardProcess.BCSCPhoto,
        serial: '123456789',
        deviceCode: 'ABCDEFGH',
      })
      expect(computeSetupStepCompletion(store).currentStep).toBe('email')
    })

    it('should return verify when verify step is focused', () => {
      const store = makeNamedStore({
        cardProcess: BCSCCardProcess.BCSCPhoto,
        serial: '123456789',
        deviceCode: 'ABCDEFGH',
        emailAddress: 'test@email.com',
        isEmailVerified: true,
      })
      expect(computeSetupStepCompletion(store).currentStep).toBe('verify')
    })

    it('should return transfer for a transfer account with no verification progress', () => {
      const store = makeStore()
      store.bcsc.accountSetupType = AccountSetupType.TransferAccount
      // A fresh transfer device has none of the id/address/email/verify progress, so
      // transfer must take priority over the (otherwise-focused) id step.
      expect(computeSetupStepCompletion(store).currentStep).toBe('transfer')
    })
  })

  describe('allCompleted property', () => {
    it('should be false when no steps are completed', () => {
      const store = makeStore()
      expect(computeSetupStepCompletion(store).allCompleted).toBe(false)
    })

    it('should be false when some steps are completed', () => {
      const store = makeNamedStore({ cardProcess: BCSCCardProcess.BCSCPhoto, serial: '123456789' })
      expect(computeSetupStepCompletion(store).allCompleted).toBe(false)
    })

    it('should be true when all steps are completed', () => {
      const store = makeNamedStore({
        cardProcess: BCSCCardProcess.BCSCPhoto,
        serial: '123456789',
        deviceCode: 'ABCDEFGH',
        emailAddress: 'test@email.com',
        isEmailVerified: true,
        verified: true,
        userSubmittedVerificationVideo: false,
      })
      expect(computeSetupStepCompletion(store).allCompleted).toBe(true)
    })
  })
})
