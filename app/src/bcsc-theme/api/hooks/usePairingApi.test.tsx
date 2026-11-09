import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { renderHook } from '@testing-library/react-native'
import { ChallengeSource, signPairingCode } from 'react-native-bcsc-core'
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
  ChallengeSource: jest.requireActual('../../../../__mocks__/react-native-bcsc-core').ChallengeSource,
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
    it.each(Object.values(ChallengeSource))(
      'signs the pairing code with challenge source %s and returns the client metadata',
      async (challengeSource) => {
        const metadata = { transaction_id: 'txn-1', client_name: 'Test Client' }
        ;(signPairingCode as jest.Mock).mockResolvedValue('signed-assertion')
        mockApiClient.post.mockResolvedValue({ data: metadata })

        const { result } = renderHook(() => usePairingApi(mockApiClient))
        const response = await result.current.loginByPairingCode('pairing-code', challengeSource)

        expect(signPairingCode).toHaveBeenCalledWith(
          'pairing-code',
          mockAccount.issuer,
          mockAccount.clientID,
          'mock-fcm-token',
          'mock-device-token',
          challengeSource
        )
        expect(mockApiClient.post).toHaveBeenCalledWith(
          `${mockApiClient.endpoints.cardTap}/${VERIFY_DEVICE_ASSERTION_PATH}`,
          { assertion: 'signed-assertion' },
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
        expect(response).toEqual(metadata)
      }
    )

    // Resolves with the error loginByPairingCode rejects with; fails the test if it resolves instead
    const loginFailure = async (): Promise<AppError> => {
      const { result } = renderHook(() => usePairingApi(mockApiClient))
      try {
        await result.current.loginByPairingCode('pairing-code', ChallengeSource.PushNotification)
      } catch (error) {
        return error as AppError
      }
      throw new Error('Expected loginByPairingCode to reject')
    }

    it('reports a native signPairingCode rejection as a device failure at the signing step', async () => {
      ;(signPairingCode as jest.Mock).mockRejectedValue(
        Object.assign(new Error('native failure'), { code: 'E_JWT_SIGN_FAILED' })
      )

      const error = await loginFailure()

      expect(error).toMatchObject({
        appEvent: AppEventCode.LOGIN_DEVICE_ERROR,
        context: expect.objectContaining({ failure_flow: 'pairing', failure_step: 'sign_pairing_code' }),
      })
      // The native mapper's error is kept as the cause
      expect((error.cause as AppError).appEvent).toBe(AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET)
      expect(error.context.failure_cause_code).toBe((error.cause as AppError).code)
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('reports a null signPairingCode result as a device failure caused by SIGN_CLAIMS_ERROR', async () => {
      ;(signPairingCode as jest.Mock).mockResolvedValue(null)

      const error = await loginFailure()

      expect(error.appEvent).toBe(AppEventCode.LOGIN_DEVICE_ERROR)
      expect(error.context.failure_step).toBe('sign_pairing_code')
      expect((error.cause as AppError).appEvent).toBe(AppEventCode.ERR_207_UNABLE_TO_SIGN_CLAIMS_SET)
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('reports a missing account as a device failure at the account step', async () => {
      const accountError = new Error('No account found. Please register first.')
      ;(withAccount as jest.Mock).mockRejectedValue(accountError)

      const error = await loginFailure()

      expect(error.appEvent).toBe(AppEventCode.LOGIN_DEVICE_ERROR)
      expect(error.context.failure_step).toBe('account')
      expect(error.cause).toBe(accountError)
    })

    it('keeps the code of an unhandled request error and adds where it failed', async () => {
      ;(signPairingCode as jest.Mock).mockResolvedValue('signed-assertion')
      const requestError = AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { track: false })
      mockApiClient.post.mockRejectedValue(requestError)

      const error = await loginFailure()

      // The same error, not a wrapper: its own code (no_internet) is the most precise label available
      expect(error).toBe(requestError)
      expect(error.appEvent).toBe(AppEventCode.NO_INTERNET)
      expect(error.context).toMatchObject({
        failure_flow: 'pairing',
        failure_step: 'verify_device_assertion',
        failure_elapsed_ms: expect.any(Number),
      })
    })

    it('rethrows a request error a policy already handled, still handled, with where it failed added', async () => {
      ;(signPairingCode as jest.Mock).mockResolvedValue('signed-assertion')
      const handledError = AppError.fromErrorDefinition(ErrorRegistry.INVALID_PAIRING_CODE, { track: false })
      handledError.handled = true
      mockApiClient.post.mockRejectedValue(handledError)

      const error = await loginFailure()

      expect(error).toBe(handledError)
      expect(error.handled).toBe(true)
      expect(error.appEvent).toBe(ErrorRegistry.INVALID_PAIRING_CODE.appEvent)
      expect(error.context).toMatchObject({
        failure_flow: 'pairing',
        failure_step: 'verify_device_assertion',
        failure_elapsed_ms: expect.any(Number),
      })
    })

    it('reports a non-AppError at the request step as a device failure', async () => {
      // ie: a native failure in the request interceptor, which passes non-Axios errors through unchanged
      ;(signPairingCode as jest.Mock).mockResolvedValue('signed-assertion')
      const nativeError = Object.assign(new Error('keychain unavailable'), { code: 'E_KEYCHAIN' })
      mockApiClient.post.mockRejectedValue(nativeError)

      const error = await loginFailure()

      expect(error.appEvent).toBe(AppEventCode.LOGIN_DEVICE_ERROR)
      expect(error.context).toMatchObject({ failure_step: 'verify_device_assertion', failure_cause_code: 'E_KEYCHAIN' })
      expect(error.cause).toBe(nativeError)
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
