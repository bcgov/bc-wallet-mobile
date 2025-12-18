import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { initialState } from '@/store'
import { renderHook } from '@testing-library/react-native'

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      // Return key with params for testing
      if (params) {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    },
  }),
}))

describe('useSetupSteps Hook', () => {
  describe('Init', () => {
    it('all steps should not be focused and completed', () => {
      // note: const store = { ...initialState } clones only top level, nested objects remain references
      const store = structuredClone(initialState)

      const { result: hook } = renderHook(() => useSetupSteps(store))

      expect(hook.current.nickname.completed).toBe(false)
      expect(hook.current.nickname.focused).toBe(true)
      expect(hook.current.id.completed).toBe(false)
      expect(hook.current.id.focused).toBe(false)
      expect(hook.current.address.completed).toBe(false)
      expect(hook.current.address.focused).toBe(false)
      expect(hook.current.email.completed).toBe(false)
      expect(hook.current.email.focused).toBe(false)
      expect(hook.current.verify.completed).toBe(false)
      expect(hook.current.verify.focused).toBe(false)
    })
  })
  describe('Nickname Step', () => {
    it('should be focused when nickname is not provided', () => {
      const store = structuredClone(initialState)
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.nickname.completed).toBe(false)
      expect(hook.result.current.nickname.focused).toBe(true)
    })

    it('should be completed when nickname is provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.nickname.completed).toBe(true)
      expect(hook.result.current.nickname.focused).toBe(false)
    })
  })

  describe('ID Step', () => {
    it('Combo Card: should be completed when serial and email provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)
    })

    it('NonPhoto Card: should not show needs additional card when only cardType is set (user backed out before serial)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      // Note: serial is NOT set - simulates user selecting card type but backing out

      const hook = renderHook(() => useSetupSteps(store))

      // Should NOT show "needs additional card" because user hasn't even entered the serial yet
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
    })

    it('Other Card: should not show needs additional card when only cardType is set (user backed out before evidence)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC
      // Note: no evidence data - simulates user selecting card type but backing out

      const hook = renderHook(() => useSetupSteps(store))

      // Should NOT show "needs additional card" because user hasn't even submitted their first ID yet
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)
      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
    })

    it('Non-Photo Card: should be completed when serial, email, and photo ID provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(true)

      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: true,
          },
          metadata: [{ uri: 'photo1.jpg' }], // At least 1 photo required
          documentNumber: 'DL123456', // Document number required
        },
      ] as any[]

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
    })

    it('Non-BCSC Card: should be completed when 2 IDs provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.cardProcess = BCSCCardProcess.NonBCSC

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: false,
          },
          metadata: [{ uri: 'photo1.jpg' }], // At least 1 photo required
          documentNumber: 'PASS123456', // Document number required
        },
      ] as any[]

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(true)

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

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)
    })
  })

  describe('Residential Address Step', () => {
    it('should be focused when ID step completed but address not yet completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.address.focused).toBe(true)
      expect(hook.result.current.address.completed).toBe(false)
    })

    it('should be completed when device code is provided', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.address.focused).toBe(false)
      expect(hook.result.current.address.completed).toBe(true)
    })
  })

  describe('Email Step', () => {
    it('should be focused when ID step completed, address step completed, but email not yet completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)
    })

    it('should be focused when BCSC card (Photo/NonPhoto) has serial but no email after completing ID and address steps', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = undefined
      store.bcscSecure.deviceCode = 'ABCDEFGH'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)

      expect(hook.result.current.address.completed).toBe(true)
      expect(hook.result.current.address.focused).toBe(false)

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)

      expect(hook.result.current.verify.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(false)
    })

    it('should be focused with NonPhoto card type when serial available but email is falsey', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCNonPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = ''
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: true,
          },
          metadata: [{ uri: 'photo1.jpg' }], // At least 1 photo required
          documentNumber: 'DL123456', // Document number required
        },
      ] as any[]

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)

      expect(hook.result.current.address.completed).toBe(true)
      expect(hook.result.current.address.focused).toBe(false)

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)
    })

    it('should not be completed when email is provided but emailConfirmed is false', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = false

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)
    })

    it('should not be completed when emailConfirmed is true but email is missing', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = undefined
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)
    })

    it('should be completed when both email and emailConfirmed are true (email may be set to BCSC_EMAIL_NOT_PROVIDED)', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(false)
      expect(hook.result.current.email.completed).toBe(true)
    })
  })

  describe('Verify Step', () => {
    it('should be focused when ID step completed, address step completed, email step completed, but verify not yet completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = false

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(true)
      expect(hook.result.current.verify.completed).toBe(false)
    })

    it('should be completed when verified is true', () => {
      const store = structuredClone(initialState)
      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(true)
    })

    it('should be completed when userSubmittedVerificationVideo is true', () => {
      const store = structuredClone(initialState)

      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = true

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(true)
    })
  })

  describe('Full workflow', () => {
    it('should progress through all steps to completion', () => {
      const store = structuredClone(initialState)

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.nickname.completed).toBe(false)
      expect(hook.result.current.nickname.focused).toBe(true)
      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(false)
      expect(hook.result.current.address.completed).toBe(false)
      expect(hook.result.current.address.focused).toBe(false)
      expect(hook.result.current.email.completed).toBe(false)
      expect(hook.result.current.email.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(false)
      expect(hook.result.current.verify.focused).toBe(false)

      store.bcsc.nicknames = ['test']
      store.bcsc.selectedNickname = 'test'

      hook.rerender(store)

      expect(hook.result.current.nickname.completed).toBe(true)
      expect(hook.result.current.nickname.focused).toBe(false)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)

      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)

      expect(hook.result.current.address.completed).toBe(false)
      expect(hook.result.current.address.focused).toBe(true)

      store.bcscSecure.deviceCode = 'ABCDEFGH'

      hook.rerender(store)

      expect(hook.result.current.address.completed).toBe(true)
      expect(hook.result.current.address.focused).toBe(false)

      expect(hook.result.current.email.completed).toBe(false)
      expect(hook.result.current.email.focused).toBe(true)

      store.bcscSecure.isEmailVerified = true

      hook.rerender(store)

      expect(hook.result.current.email.completed).toBe(true)
      expect(hook.result.current.email.focused).toBe(false)

      expect(hook.result.current.verify.completed).toBe(false)
      expect(hook.result.current.verify.focused).toBe(true)

      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false

      hook.rerender(store)

      expect(hook.result.current.verify.completed).toBe(true)
      expect(hook.result.current.verify.focused).toBe(false)
    })
  })

  describe('currentStep property', () => {
    it('should return nickname when nickname step is focused', () => {
      const store = structuredClone(initialState)
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe('nickname')
    })

    it('should return id when id step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe('id')
    })

    it('should return address when address step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe('address')
    })

    it('should return email when email step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe('email')
    })

    it('should return verify when verify step is focused', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.email = 'test@email.com'
      store.bcscSecure.isEmailVerified = true
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe('verify')
    })

    it('should return null when all steps are completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.email = 'test@email.com'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.currentStep).toBe(null)
    })
  })

  describe('allCompleted property', () => {
    it('should be false when no steps are completed', () => {
      const store = structuredClone(initialState)
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.allCompleted).toBe(false)
    })

    it('should be false when some steps are completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.allCompleted).toBe(false)
    })

    it('should be true when all steps are completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      store.bcscSecure.deviceCode = 'ABCDEFGH'
      store.bcscSecure.email = 'test@email.com'
      store.bcscSecure.isEmailVerified = true
      store.bcscSecure.verified = true
      store.bcscSecure.userSubmittedVerificationVideo = false
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.allCompleted).toBe(true)
    })
  })

  describe('subtext property', () => {
    it('should return default subtext for nickname when not completed', () => {
      const store = structuredClone(initialState)
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.nickname.subtext).toEqual(['BCSC.NicknameAccount.AccountName'])
    })

    it('should return nickname in subtext when completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'MyAccount'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.nickname.subtext[0]).toContain('MyAccount')
    })

    it('should return scan/photos subtext for id when not completed', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.id.subtext).toEqual(['BCSC.Steps.ScanOrTakePhotos'])
    })

    it('should return serial number in subtext when id is completed with BCSC card', () => {
      const store = structuredClone(initialState)
      store.bcsc.selectedNickname = 'test'
      store.bcscSecure.cardProcess = BCSCCardProcess.BCSCPhoto
      store.bcscSecure.serial = '123456789'
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.id.subtext[0]).toContain('123456789')
    })

    it('should have empty subtext for email step (custom children rendering)', () => {
      const store = structuredClone(initialState)
      const hook = renderHook(() => useSetupSteps(store))
      expect(hook.result.current.email.subtext).toEqual([])
    })
  })
})
