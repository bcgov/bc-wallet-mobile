import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as Bifold from '@bifold/core'
import * as Navigation from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import useAlreadyVerifiedRecovery from './useAlreadyVerifiedRecovery'

const mockCheckVerificationStatus = jest.fn()
// Factory mock (not automock) so the real token service — and the store module it pulls in — is
// never loaded, which the wholesale @bifold/core mock below would break.
jest.mock('@/bcsc-theme/services/hooks/useTokenService', () => ({
  __esModule: true,
  useTokenService: () => ({ checkVerificationStatus: mockCheckVerificationStatus }),
}))
jest.mock('@bifold/core', () => ({
  __esModule: true,
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
  useStore: jest.fn(),
}))
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

// The repo's manual @react-navigation/native mock exposes CommonActions.reset as a jest.fn, so the
// navigation intent is asserted there rather than on the shared navigation object's dispatch.
const mockReset = Navigation.CommonActions.reset as jest.Mock

const mockLogger = { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() }

const setStore = (bcscSecure: Record<string, unknown>) => {
  jest.mocked(Bifold).useStore.mockReturnValue([{ bcscSecure }, jest.fn()] as any)
}

describe('useAlreadyVerifiedRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Bifold).useServices.mockReturnValue([mockLogger] as any)
    setStore({ deviceCode: 'device-code', userCode: 'user-code' })
  })

  describe('recoverFromAlreadyVerified', () => {
    it('fetches tokens and resets to the success screen when the user is verified', async () => {
      mockCheckVerificationStatus.mockResolvedValue(true)

      const { result } = renderHook(() => useAlreadyVerifiedRecovery())
      const recovered = await result.current.recoverFromAlreadyVerified()

      expect(mockCheckVerificationStatus).toHaveBeenCalledWith('device-code', 'user-code')
      expect(recovered).toBe(true)
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({ routes: [{ name: BCSCScreens.VerificationSuccess }] })
      )
    })

    it('returns false without navigating when the tokens are not yet issuable', async () => {
      mockCheckVerificationStatus.mockResolvedValue(false)

      const { result } = renderHook(() => useAlreadyVerifiedRecovery())
      const recovered = await result.current.recoverFromAlreadyVerified()

      expect(recovered).toBe(false)
      expect(mockReset).not.toHaveBeenCalled()
    })

    it('returns false without navigating when the token exchange throws', async () => {
      mockCheckVerificationStatus.mockRejectedValue(new Error('network'))

      const { result } = renderHook(() => useAlreadyVerifiedRecovery())
      const recovered = await result.current.recoverFromAlreadyVerified()

      expect(recovered).toBe(false)
      expect(mockReset).not.toHaveBeenCalled()
    })

    it('returns false without calling the token endpoint when the device codes are missing', async () => {
      setStore({})

      const { result } = renderHook(() => useAlreadyVerifiedRecovery())
      const recovered = await result.current.recoverFromAlreadyVerified()

      expect(recovered).toBe(false)
      expect(mockCheckVerificationStatus).not.toHaveBeenCalled()
      expect(mockReset).not.toHaveBeenCalled()
    })
  })
})
