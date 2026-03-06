import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { renderHook } from '@testing-library/react-native'
import {
  AccountSecurityMethod,
  BcscNativeError,
  BcscNativeErrorCodes,
  getAccount,
  getAccountSecurityMethod,
  getDynamicClientRegistrationBody,
  isBcscNativeError,
  setAccount,
} from 'react-native-bcsc-core'
import useRegistrationApi from './useRegistrationApi'

const mockUpdateTokens = jest.fn()
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

jest.mock('@bifold/core', () => ({
  useStore: () => [
    {
      bcsc: { selectedNickname: 'TestNickname' },
      bcscSecure: { registrationAccessToken: 'mock-reg-token' },
    },
  ],
  useServices: () => [mockLogger],
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    updateTokens: mockUpdateTokens,
  }),
}))

jest.mock('@/bcsc-theme/utils/push-notification-tokens', () => ({
  getNotificationTokens: jest.fn().mockResolvedValue({
    fcmDeviceToken: 'mock-fcm-token',
    deviceToken: 'mock-device-token',
  }),
}))

jest.mock('@bifold/react-native-attestation', () => ({
  getAppStoreReceipt: jest.fn().mockResolvedValue('mock-ios-receipt'),
  googleAttestation: jest.fn().mockResolvedValue('mock-google-attestation'),
}))

const mockApiClient = {
  baseURL: 'https://mock-api.example.com',
  endpoints: {
    registration: 'https://mock-api.example.com/registration',
    issuer: 'https://mock-issuer.example.com',
  },
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

const mockRegistrationResponse = {
  client_id: 'test-client-id',
  client_id_issued_at: 1234567890,
  registration_access_token: 'new-reg-access-token',
  registration_client_uri: 'https://mock-api.example.com/registration/test-client-id',
  redirect_uris: ['https://redirect.example.com'],
  client_name: 'TestNickname',
  token_endpoint_auth_method: 'private_key_jwt',
  scope: 'openid profile',
  grant_types: ['authorization_code'],
  response_types: ['code'],
  jwks: { keys: [] },
  request_object_signing_alg: 'RS256',
  userinfo_signed_response_alg: 'RS256',
  userinfo_encrypted_response_alg: 'RSA-OAEP',
  userinfo_encrypted_response_enc: 'A128CBC-HS256',
  id_token_signed_response_alg: 'RS256',
  id_token_encrypted_response_alg: 'RSA-OAEP',
  id_token_encrypted_response_enc: 'A128CBC-HS256',
  token_endpoint_auth_signing_alg: 'RS256',
  default_max_age: 300,
  require_auth_time: true,
  default_acr_values: ['urn:mace:incommon:iap:silver'],
}

describe('useRegistrationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(JSON.stringify({ software_statement: 'mock-jwt' }))
    jest.mocked(isBcscNativeError).mockReturnValue(false)
    mockApiClient.post.mockResolvedValue({ data: mockRegistrationResponse })
    mockApiClient.put.mockResolvedValue({ data: mockRegistrationResponse })
    mockUpdateTokens.mockResolvedValue(undefined)
    jest.mocked(setAccount).mockResolvedValue(undefined)
    jest.mocked(getAccount).mockResolvedValue(null)
    jest.mocked(getAccountSecurityMethod).mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
  })

  // ---------------------------------------------------------------------------
  // createRegistration
  // ---------------------------------------------------------------------------
  describe('createRegistration', () => {
    it('should complete registration successfully', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)

      expect(getDynamicClientRegistrationBody).toHaveBeenCalledWith(
        'mock-fcm-token',
        'mock-device-token',
        'mock-ios-receipt'
      )
      expect(mockApiClient.post).toHaveBeenCalledWith(mockApiClient.endpoints.registration, expect.any(String), {
        headers: { 'Content-Type': 'application/json' },
        skipBearerAuth: true,
      })
      expect(setAccount).toHaveBeenCalledWith({
        clientID: 'test-client-id',
        issuer: mockApiClient.endpoints.issuer,
        securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
        nickname: 'TestNickname',
      })
      expect(mockUpdateTokens).toHaveBeenCalledWith({
        registrationAccessToken: 'new-reg-access-token',
      })
      expect(data).toEqual(mockRegistrationResponse)
    })

    it('should throw if client is not ready', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)).rejects.toThrow(
        'BCSC client not ready for registration'
      )
    })

    it('should throw CLIENT_REGISTRATION_NULL when DCR body is null', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
      }
    })

    it.each([
      [BcscNativeErrorCodes.KEYCHAIN_KEY_GENERATION_ERROR, AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR],
      [BcscNativeErrorCodes.TOJSON_METHOD_FAILURE, AppEventCode.ERR_120_TOJSON_METHOD_FAILURE],
      [BcscNativeErrorCodes.TOJSONSTRING_METHOD_FAILURE, AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_EXISTS, AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_DOESNT_EXIST, AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR],
      [BcscNativeErrorCodes.JWT_DEVICE_INFO_ERROR, AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR],
    ])('should map native error code %s to AppError with appEvent %s', async (nativeCode, expectedAppEvent) => {
      const nativeError = { code: nativeCode, message: 'native error' } as unknown as BcscNativeError
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(nativeError)
      jest.mocked(isBcscNativeError).mockReturnValue(true)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(expectedAppEvent)
      }
    })

    it('should fall through to CLIENT_REGISTRATION_FAILURE for unknown native errors', async () => {
      const unknownError = { code: 'E_UNKNOWN', message: 'unknown native error' }
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(unknownError)
      jest.mocked(isBcscNativeError).mockReturnValue(true)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE)
      }
    })

    it('should fall through to CLIENT_REGISTRATION_FAILURE for non-native errors', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(new Error('generic JS error'))
      jest.mocked(isBcscNativeError).mockReturnValue(false)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.createRegistration(AccountSecurityMethod.PinNoDeviceAuth)
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(AppEventCode.ERR_120_CLIENT_REGISTRATION_FAILURE)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // register (with account guard)
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('should skip registration if an account already exists', async () => {
      jest.mocked(getAccount).mockResolvedValue({ clientID: 'existing-client' } as any)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.register(AccountSecurityMethod.PinNoDeviceAuth)

      expect(data).toBeUndefined()
      expect(getDynamicClientRegistrationBody).not.toHaveBeenCalled()
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('should call createRegistration when no account exists', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.register(AccountSecurityMethod.PinNoDeviceAuth)

      expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
      expect(mockApiClient.post).toHaveBeenCalled()
      expect(data).toEqual(mockRegistrationResponse)
    })
  })

  // ---------------------------------------------------------------------------
  // updateRegistration
  // ---------------------------------------------------------------------------
  describe('updateRegistration', () => {
    const existingAccount = {
      clientID: 'existing-client-id',
      issuer: 'https://mock-issuer.example.com',
    }

    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(existingAccount as any)
    })

    it('should complete update registration successfully', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.updateRegistration('reg-access-token', 'NewNickname')

      expect(getDynamicClientRegistrationBody).toHaveBeenCalledWith(
        'mock-fcm-token',
        'mock-device-token',
        'mock-ios-receipt',
        'NewNickname'
      )
      expect(mockApiClient.put).toHaveBeenCalledWith(
        `${mockApiClient.endpoints.registration}/${existingAccount.clientID}`,
        expect.objectContaining({
          client_id: existingAccount.clientID,
          scope: 'openid profile email address offline_access',
        }),
        expect.objectContaining({
          skipBearerAuth: true,
          headers: expect.objectContaining({
            Authorization: 'Bearer reg-access-token',
          }),
        })
      )
      expect(setAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: mockRegistrationResponse.client_id,
          nickname: 'NewNickname',
          didPostNicknameToServer: true,
        })
      )
      expect(mockUpdateTokens).toHaveBeenCalledWith({
        registrationAccessToken: mockRegistrationResponse.registration_access_token,
      })
      expect(data).toEqual(mockRegistrationResponse)
    })

    it('should throw if client is not ready (with existing account)', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.updateRegistration('token', 'nickname')).rejects.toThrow(
        'BCSC client not ready for registration update'
      )
    })

    it('should throw if no account exists and client is not ready', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.updateRegistration('token', 'nickname')).rejects.toThrow(
        'No account found. Please register first.'
      )
    })

    it('should throw if no registration access token is provided', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration(undefined, 'nickname')).rejects.toThrow(
        'No registration access token found for registration update'
      )
    })

    it('should throw if no nickname is provided', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('token', undefined)).rejects.toThrow(
        'No client name found for registration update'
      )
    })

    it('should throw if no account exists', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('token', 'nickname')).rejects.toThrow(
        'No account found. Please register first.'
      )
    })

    it('should throw CLIENT_REGISTRATION_NULL when DCR body is null', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.updateRegistration('token', 'nickname')
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
      }
    })

    it.each([
      [BcscNativeErrorCodes.TOJSON_METHOD_FAILURE, AppEventCode.ERR_120_TOJSON_METHOD_FAILURE],
      [BcscNativeErrorCodes.TOJSONSTRING_METHOD_FAILURE, AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_EXISTS, AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_DOESNT_EXIST, AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_GENERATION_ERROR, AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR],
      [BcscNativeErrorCodes.JWT_DEVICE_INFO_ERROR, AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR],
    ])('should map native error code %s to AppError with appEvent %s', async (nativeCode, expectedAppEvent) => {
      const nativeError = { code: nativeCode, message: 'native error' }
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(nativeError)
      jest.mocked(isBcscNativeError).mockReturnValue(true)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.updateRegistration('token', 'nickname')
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(expectedAppEvent)
      }
    })

    it('should throw DESERIALIZE_JSON_ERROR when body cannot be parsed as JSON', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue('not valid json {{{')

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      try {
        await result.current.updateRegistration('token', 'nickname')
        fail('Expected an error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).appEvent).toBe(AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)
      }
    })

    it('should propagate API errors from the PUT request', async () => {
      mockApiClient.put.mockRejectedValue(new Error('Server unavailable'))

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('token', 'nickname')).rejects.toThrow('Server unavailable')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update registration'))
    })

    it('should still return data even if post-update storage fails', async () => {
      jest.mocked(setAccount).mockRejectedValue(new Error('storage write failure'))

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.updateRegistration('token', 'nickname')

      expect(data).toEqual(mockRegistrationResponse)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store updated registration data')
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deleteRegistration
  // ---------------------------------------------------------------------------
  describe('deleteRegistration', () => {
    it('should return success for 2xx status codes', async () => {
      mockApiClient.delete.mockResolvedValue({ status: 204 })

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const response = await result.current.deleteRegistration('client-to-delete')

      expect(response).toEqual({ success: true })
      expect(mockApiClient.delete).toHaveBeenCalledWith(`${mockApiClient.endpoints.registration}/client-to-delete`, {
        skipBearerAuth: true,
        headers: {
          Authorization: 'Bearer mock-reg-token',
        },
      })
    })

    it('should return failure for non-2xx status codes', async () => {
      mockApiClient.delete.mockResolvedValue({ status: 404 })

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const response = await result.current.deleteRegistration('client-to-delete')

      expect(response).toEqual({ success: false })
    })

    it('should throw if client is not ready', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.deleteRegistration('client-to-delete')).rejects.toThrow(
        'BCSC client not ready for registration deletion'
      )
    })
  })
})
