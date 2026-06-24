import { TermsOfUseResponseData } from '@/bcsc-theme/api/hooks/useConfigApi'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { TermsOfUseSystemCheck } from '@/services/system-checks/TermsOfUseSystemCheck'
import { BCDispatchAction } from '@/store'
import { MockLogger } from '@bifold/core'

const mockTermsOfUse = (version: unknown): TermsOfUseResponseData =>
  ({
    version,
    date: '2025-06-06',
    html: '<p>Terms of Use content</p>',
  }) as TermsOfUseResponseData

const createMockUtils = () => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: new MockLogger(),
})

describe('TermsOfUseSystemCheck', () => {
  describe('runCheck', () => {
    it('should return true when accepted version matches the server version', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse('8'))
      const mockNavigation = { navigate: jest.fn() } as any

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, createMockUtils())

      const result = await termsOfUseCheck.runCheck()

      expect(mockGetTermsOfUse).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should return false when accepted version differs from the server version', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse('9'))
      const mockNavigation = { navigate: jest.fn() } as any

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, createMockUtils())

      const result = await termsOfUseCheck.runCheck()

      expect(result).toBe(false)
    })

    it('should return true when no accepted version is recorded (grandfathering)', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse('8'))
      const mockNavigation = { navigate: jest.fn() } as any

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, undefined, mockNavigation, createMockUtils())

      const result = await termsOfUseCheck.runCheck()

      expect(result).toBe(true)
    })

    it('should return true when the terms of use fetch fails (fail open)', async () => {
      const mockGetTermsOfUse = jest.fn().mockRejectedValue(new Error('Network error'))
      const mockNavigation = { navigate: jest.fn() } as any

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, createMockUtils())

      const result = await termsOfUseCheck.runCheck()

      expect(result).toBe(true)
    })

    it('should compare versions as strings when the server returns a number', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse(8))
      const mockNavigation = { navigate: jest.fn() } as any

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, createMockUtils())

      const result = await termsOfUseCheck.runCheck()

      expect(result).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should navigate to the blocking terms of use modal', () => {
      const mockGetTermsOfUse = jest.fn()
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createMockUtils()

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, mockUtils)

      termsOfUseCheck.onFail()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCModals.TermsOfUseUpdated)
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('onSuccess', () => {
    it('should seed the accepted version when none was recorded', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse(8))
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createMockUtils()

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, undefined, mockNavigation, mockUtils)

      await termsOfUseCheck.runCheck()
      termsOfUseCheck.onSuccess()

      expect(mockUtils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_ACCEPTED_TERMS_OF_USE_VERSION,
        payload: ['8'],
      })
    })

    it('should not dispatch when an accepted version was already recorded', async () => {
      const mockGetTermsOfUse = jest.fn().mockResolvedValue(mockTermsOfUse('8'))
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createMockUtils()

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, '8', mockNavigation, mockUtils)

      await termsOfUseCheck.runCheck()
      termsOfUseCheck.onSuccess()

      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })

    it('should not dispatch when the terms of use fetch failed', async () => {
      const mockGetTermsOfUse = jest.fn().mockRejectedValue(new Error('Network error'))
      const mockNavigation = { navigate: jest.fn() } as any
      const mockUtils = createMockUtils()

      const termsOfUseCheck = new TermsOfUseSystemCheck(mockGetTermsOfUse, undefined, mockNavigation, mockUtils)

      await termsOfUseCheck.runCheck()
      termsOfUseCheck.onSuccess()

      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })
  })
})
