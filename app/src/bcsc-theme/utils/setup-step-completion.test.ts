import { computeSetupStepCompletion } from '@/bcsc-theme/utils/setup-step-completion'
import { initialState } from '@/store'
import { BCSCCardProcess } from 'react-native-bcsc-core'

describe('computeSetupStepCompletion', () => {
  describe('Init', () => {
    it('all steps should not be focused and completed', () => {
      // note: const store = { ...initialState } clones only top level, nested objects remain references
      const store = structuredClone(initialState)

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
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'

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
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      // Note: serial is NOT set - simulates user selecting card type but backing out

      const result = computeSetupStepCompletion(store)

      // Should NOT show "needs additional card" because user hasn't even entered the serial yet
      expect(result.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
    })

    it('Other Card: should not show needs additional card when only cardType is set (user backed out before evidence)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC
      // Note: no evidence data - simulates user selecting card type but backing out

      const result = computeSetupStepCompletion(store)

      // Should NOT show "needs additional card" because user hasn't even submitted their first ID yet
      expect(result.id.nonBcscNeedsAdditionalCard).toBe(false)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
    })

    it('Non-Photo Card: should be completed when serial, email, and photo ID provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'

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
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'

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
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'

      const result = computeSetupStepCompletion(store)

      expect(result.address.focused).toBe(true)
      expect(result.address.completed).toBe(false)
    })

    it('should be completed when device code is provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'

      const result = computeSetupStepCompletion(store)

      expect(result.address.focused).toBe(false)
      expect(result.address.completed).toBe(true)
    })
  })

  describe('Email Step', () => {
    it('should be focused when ID step completed, address step completed, but email not yet completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should be focused when BCSC card (Photo/NonPhoto) has serial but no email after completing ID and address steps', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = undefined
      store.bcscSecure.deviceCode = 'ABCDEFGH'

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
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = ''
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: true,
          },
          metadata: [{ uri: 'photo1.jpg' }],
          documentNumber: 'DL123456',
        },
      ] as any[]

      const result = computeSetupStepCompletion(store)

      expect(result.id.completed).toBe(true)
      expect(result.id.focused).toBe(false)

      expect(result.address.completed).toBe(true)
      expect(result.address.focused).toBe(false)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should not be completed when email is provided but emailConfirmed is false', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = false

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should not be completed when emailConfirmed is true but email is missing', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = undefined
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })

    it('should be completed when both email and emailConfirmed are true (email may be set to BCSC_EMAIL_NOT_PROVIDED)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(false)
      expect(result.email.completed).toBe(true)
    })

    it('should be completed when user skipped email (userSkippedEmailVerification=true, no emailAddress — v3 migration case)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = undefined
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = false
      store.bcscSecure.userSkippedEmailVerification = true

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(false)
      expect(result.email.completed).toBe(true)
    })

    it('should not be completed when email entered but not verified, even if userSkippedEmailVerification was previously set', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = false
      store.bcscSecure.userSkippedEmailVerification = false

      const result = computeSetupStepCompletion(store)

      expect(result.email.focused).toBe(true)
      expect(result.email.completed).toBe(false)
    })
  })

  describe('Verify Step', () => {
    it('should be focused when ID step completed, address step completed, email step completed, but verify not yet completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = false

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(false)
    })

    it('should be completed when verified is true', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(true)
    })

    it('should be completed when userSubmittedVerificationVideo is true', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.emailAddress = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = true

      const result = computeSetupStepCompletion(store)

      expect(result.verify.focused).toBe(true)
      expect(result.verify.completed).toBe(true)
    })
  })

  describe('Full workflow', () => {
    it('should progress through all steps to completion', () => {
      const store = structuredClone(initialState)

      let result = computeSetupStepCompletion(store)
      expect(result.id.completed).toBe(false)
      expect(result.id.focused).toBe(true)
      expect(result.address.completed).toBe(false)
      expect(result.address.focused).toBe(false)
      expect(result.email.completed).toBe(false)
      expect(result.email.focused).toBe(false)
      expect(result.verify.completed).toBe(false)
      expect(result.verify.focused).toBe(false)

      store.bcsc.nicknames = ['test']
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
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      expect(computeSetupStepCompletion(store).currentStep).toBe('id')
    })

    it('should return address when address step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      expect(computeSetupStepCompletion(store).currentStep).toBe('address')
    })

    it('should return email when email step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      expect(computeSetupStepCompletion(store).currentStep).toBe('email')
    })

    it('should return verify when verify step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.emailAddress = 'test@email.com'
      store.bcscSecure.isEmailVerified = true
      expect(computeSetupStepCompletion(store).currentStep).toBe('verify')
    })
  })

  describe('allCompleted property', () => {
    it('should be false when no steps are completed', () => {
      const store = structuredClone(initialState)
      expect(computeSetupStepCompletion(store).allCompleted).toBe(false)
    })

    it('should be false when some steps are completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      expect(computeSetupStepCompletion(store).allCompleted).toBe(false)
    })

    it('should be true when all steps are completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.emailAddress = 'test@email.com'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false
      expect(computeSetupStepCompletion(store).allCompleted).toBe(true)
    })
  })
})
