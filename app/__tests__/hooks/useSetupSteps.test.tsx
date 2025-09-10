import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { initialState } from '@/store'
import { renderHook } from '@testing-library/react-native'
import lodash from 'lodash'

describe('useSetupSteps Hook', () => {
  describe('Init', () => {
    it('all steps should not be focused and completed', () => {
      // note: const store = { ...initialState } clones only top level, nested objects remain references
      const store = lodash.cloneDeep(initialState)

      const { result: hook } = renderHook(() => useSetupSteps(store))

      expect(hook.current.id.completed).toBe(false)
      expect(hook.current.id.focused).toBe(true)
      expect(hook.current.address.completed).toBe(false)
      expect(hook.current.address.focused).toBe(false)
      expect(hook.current.email.completed).toBe(false)
      expect(hook.current.email.focused).toBe(false)
      expect(hook.current.verify.completed).toBe(false)
      expect(hook.current.verify.focused).toBe(false)
    })
  })

  describe('ID Step', () => {
    it('Combo Card: should be completed when serial and email provided', () => {
      const store = lodash.cloneDeep(initialState)

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)
    })

    it('Non-Photo Card: should be completed when serial, email, and photo ID provided', () => {
      const store = lodash.cloneDeep(initialState)

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)

      store.bcsc.cardType = BCSCCardType.NonPhoto
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(true)

      store.bcsc.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: true,
          },
        },
      ] as any[]

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)
      expect(hook.result.current.id.nonPhotoBcscNeedsAdditionalCard).toBe(false)
    })

    it('Non-BCSC Card: should be completed when 2 IDs provided', () => {
      const store = lodash.cloneDeep(initialState)

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcsc.cardType = BCSCCardType.Other

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(false)

      store.bcsc.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: false,
          },
        },
      ] as any[]

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.id.nonBcscNeedsAdditionalCard).toBe(true)

      store.bcsc.additionalEvidenceData = [
        {
          evidenceType: {
            has_photo: false,
          },
        },
        {
          evidenceType: {
            has_photo: true,
          },
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
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'

      const hook = renderHook(() => useSetupSteps(store))

      // Address step should be focused
      expect(hook.result.current.address.focused).toBe(true)
      expect(hook.result.current.address.completed).toBe(false)
    })

    it('should be completed when device code is provided', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.address.focused).toBe(false)
      expect(hook.result.current.address.completed).toBe(true)
    })
  })

  describe('Email Step', () => {
    it('should be focused when ID step completed, address step completed, but email not yet completed', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(true)
      expect(hook.result.current.email.completed).toBe(false)
    })

    it('should be completed when email and emailConfirmed are provided', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'
      store.bcsc.emailConfirmed = true

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.email.focused).toBe(false)
      expect(hook.result.current.email.completed).toBe(true)
    })
  })

  describe('Verify Step', () => {
    it('should be focused when ID step completed, address step completed, email step completed, but verify not yet completed', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'
      store.bcsc.emailConfirmed = true
      store.bcsc.verified = false

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(true)
      expect(hook.result.current.verify.completed).toBe(false)
    })

    it('should be completed when verified is true', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'
      store.bcsc.emailConfirmed = true
      store.bcsc.verified = true
      store.bcsc.pendingVerification = false

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(true)
    })

    it('should be focused when pendingVerification is true', () => {
      const store = lodash.cloneDeep(initialState)

      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'
      store.bcsc.deviceCode = 'ABCDEFGH'
      store.bcsc.emailConfirmed = true
      store.bcsc.verified = true
      store.bcsc.pendingVerification = true

      const hook = renderHook(() => useSetupSteps(store))

      expect(hook.result.current.verify.focused).toBe(true)
      expect(hook.result.current.verify.completed).toBe(false)
    })
  })

  describe('Full workflow', () => {
    it('should progress through all steps to completion', () => {
      const store = lodash.cloneDeep(initialState)

      const hook = renderHook(() => useSetupSteps(store))

      // Step 1: ID step should be focused
      expect(hook.result.current.id.completed).toBe(false)
      expect(hook.result.current.id.focused).toBe(true)
      expect(hook.result.current.address.completed).toBe(false)
      expect(hook.result.current.address.focused).toBe(false)
      expect(hook.result.current.email.completed).toBe(false)
      expect(hook.result.current.email.focused).toBe(false)
      expect(hook.result.current.verify.completed).toBe(false)
      expect(hook.result.current.verify.focused).toBe(false)

      // Complete Step 1
      store.bcsc.cardType = BCSCCardType.Combined
      store.bcsc.serial = '123456789'
      store.bcsc.email = 'steveBrule@email.com'

      hook.rerender(store)

      expect(hook.result.current.id.completed).toBe(true)
      expect(hook.result.current.id.focused).toBe(false)

      // Step 2: Address step should be focused
      expect(hook.result.current.address.completed).toBe(false)
      expect(hook.result.current.address.focused).toBe(true)

      // Complete Step 2
      store.bcsc.deviceCode = 'ABCDEFGH'

      hook.rerender(store)

      expect(hook.result.current.address.completed).toBe(true)
      expect(hook.result.current.address.focused).toBe(false)

      // Step 3: Email step should be focused
      expect(hook.result.current.email.completed).toBe(false)
      expect(hook.result.current.email.focused).toBe(true)

      // Complete Step 3
      store.bcsc.emailConfirmed = true

      hook.rerender(store)

      expect(hook.result.current.email.completed).toBe(true)
      expect(hook.result.current.email.focused).toBe(false)

      // Step 4: Verify step should be focused
      expect(hook.result.current.verify.completed).toBe(false)
      expect(hook.result.current.verify.focused).toBe(true)

      // Complete Step 4
      store.bcsc.verified = true
      store.bcsc.pendingVerification = false

      hook.rerender(store)

      expect(hook.result.current.verify.completed).toBe(true)
      expect(hook.result.current.verify.focused).toBe(false)
    })
  })
})
