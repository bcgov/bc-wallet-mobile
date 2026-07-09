import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppEventCode } from '@/events/appEventCode'
import { renderHook } from '@testing-library/react-native'
import { signPairingCode } from 'react-native-bcsc-core'
import usePairingApi from './usePairingApi'
import { withAccount } from './withAccountGuard'

// Prettier automatically adds a ; at the start of some lines, which causes eslint no-extra-semi to complain
/* eslint-disable no-extra-semi */

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

jest.mock('@bifold/core', () => ({
  useServices: () => [mockLogger],
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
}))

jest.mock('react-native-bcsc-core', () => ({
  signPairingCode: jest.fn(),
  // Delegate to the central manual mock so the predicate can't drift from the real implementation.
  isBcscNativeError: jest.requireActual('../../../../__mocks__/react-native-bcsc-core').isBcscNativeError,
}))

jest.mock('./withAccountGuard', () => ({
  withAccount: jest.fn(),
}))

jest.mock('@/bcsc-theme/utils/push-notification-tokens', () => ({
  getNotificationTokens: jest.fn().mockResolvedValue({
    fcmDeviceToken: 'mock-fcm-token',
    deviceToken: 'mock-device-token',
  }),
}))

const mockAccount = { clientID: 'mock-client-id', issuer: 'mock-issuer' }

const mockApiClient = {
  endpoints: { cardTap: 'https://mock-api.example.com/cardtap' },
  post: jest.fn(),
  delete: jest.fn(),
} as any

describe('usePairingApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(withAccount as jest.Mock).mockImplementation(async (callback) => callback(mockAccount))
  })

  describe('loginByPairingCode', () => {
    it('signs the pairing code and returns the client metadata', async () => {
      const metadata = { transaction_id: 'txn-1', client_name: 'Test Client' }
      ;(signPairingCode as jest.Mock).mockResolvedValue('signed-assertion')
      mockApiClient.post.mockResolvedValue({ data: metadata })

      const { result } = renderHook(() => usePairingApi(mockApiClient))
      const response = await result.current.loginByPairingCode('pairing-code')

      expect(signPairingCode).toHaveBeenCalledWith(
        'pairing-code',
        mockAccount.issuer,
        mockAccount.clientID,
        'mock-fcm-token',
        'mock-device-token'
      )
      expect(mockApiClient.post).toHaveBeenCalledWith(
        `${mockApiClient.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`,
        { assertion: 'signed-assertion' },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      expect(response).toEqual(metadata)
    })

    it('maps a native signPairingCode rejection through the native mapper', async () => {
      ;(signPairingCode as jest.Mock).mockRejectedValue(
        Object.assign(new Error('native failure'), { code: 'E_JWT_SIGN_FAILED' })
      )

      const { result } = renderHook(() => usePairingApi(mockApiClient))

      await expect(result.current.loginByPairingCode('pairing-code')).rejects.toMatchObject({
        appEvent: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
      })
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('throws SIGN_CLAIMS_ERROR when signPairingCode resolves null', async () => {
      ;(signPairingCode as jest.Mock).mockResolvedValue(null)

      const { result } = renderHook(() => usePairingApi(mockApiClient))

      await expect(result.current.loginByPairingCode('pairing-code')).rejects.toMatchObject({
        appEvent: AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET,
      })
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })
  })

  describe('forgetAllPairings', () => {
    it('deletes the device pairings for the current account', async () => {
      mockApiClient.delete.mockResolvedValue(undefined)

      const { result } = renderHook(() => usePairingApi(mockApiClient))
      await result.current.forgetAllPairings()

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `${mockApiClient.endpoints.cardTap}/v3/devices/${mockAccount.clientID}/pairings`
      )
    })
  })
})
