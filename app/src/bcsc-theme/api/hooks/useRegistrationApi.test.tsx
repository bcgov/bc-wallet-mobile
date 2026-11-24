import { AppError } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { renderHook } from '@testing-library/react-native'
import {
  AccountSecurityMethod,
  BcscNativeError,
  BcscNativeErrorCodes,
  getAccount,
  getDynamicClientRegistrationBody,
  getToken,
  isBcscNativeError,
  setAccount,
  TokenType,
} from 'react-native-bcsc-core'
import useRegistrationApi from './useRegistrationApi'

const mockSaveRegistration = jest.fn()
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
    saveRegistration: mockSaveRegistration,
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

// An arbitrary "modulus" whose first byte has its high bit set — the shape that forces DER's
// ASN.1 INTEGER encoding to prepend a 0x00 sign byte, matching the real iOS DCR path.
const REAL_MODULUS_BYTES = [0xc0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]
const toStdBase64 = (bytes: number[]) => Buffer.from(bytes).toString('base64')
const toBase64UrlUnpadded = (bytes: number[]) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// Sent (iOS-shaped, std base64 with leading 0x00) vs. echoed (Android-shaped, canonical
// base64url) encodings of the SAME modulus — confirms encoding-tolerant comparison.
const SENT_N_IOS_SHAPE = toStdBase64([0x00, ...REAL_MODULUS_BYTES])
const SERVER_N_ANDROID_SHAPE = toBase64UrlUnpadded(REAL_MODULUS_BYTES)

/** Asserts a promise rejects with an AppError carrying `appEvent`. Fails if it resolves. */
const expectAppErrorRejection = async (promise: Promise<unknown>, appEvent: AppEventCode) => {
  // The resolve path has to fail loudly: `.catch((e) => e)` passes the resolved value
  // straight through, so an implementation that *returns* an AppError instead of
  // throwing one would satisfy the assertions below.
  const error: unknown = await promise.then(
    (value) => {
      throw new Error(`Expected a rejection, but the promise resolved with: ${String(value)}`)
    },
    (reason: unknown) => reason
  )
  expect(error).toBeInstanceOf(AppError)
  expect((error as AppError).appEvent).toBe(appEvent)
}

// An account that exists but has not registered yet: it has no client ID
const unregisteredAccount = {
  id: 'account-1',
  issuer: 'https://mock-issuer.example.com',
  securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
}

describe('useRegistrationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(JSON.stringify({ software_statement: 'mock-jwt' }))
    jest.mocked(isBcscNativeError).mockReturnValue(false)
    mockApiClient.post.mockResolvedValue({ data: mockRegistrationResponse })
    mockApiClient.put.mockResolvedValue({ data: mockRegistrationResponse })
    mockSaveRegistration.mockResolvedValue(undefined)
    jest.mocked(setAccount).mockResolvedValue(undefined)
    jest.mocked(getAccount).mockResolvedValue(unregisteredAccount as any)
    jest.mocked(getToken).mockResolvedValue(null)
  })

  // ---------------------------------------------------------------------------
  // createRegistration
  // ---------------------------------------------------------------------------
  describe('createRegistration', () => {
    it('should complete registration successfully', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.createRegistration()

      expect(getDynamicClientRegistrationBody).toHaveBeenCalledWith(
        'mock-fcm-token',
        'mock-device-token',
        'mock-ios-receipt'
      )
      expect(mockApiClient.post).toHaveBeenCalledWith(mockApiClient.endpoints.registration, expect.any(String), {
        skipBearerAuth: true,
      })
      // The client ID, issuer and registration access token are saved together, in one step
      expect(mockSaveRegistration).toHaveBeenCalledTimes(1)
      expect(mockSaveRegistration).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        issuer: mockApiClient.endpoints.issuer,
        registrationAccessToken: 'new-reg-access-token',
      })
      // Registering never saves the account: its security method and nickname are not the registration's
      expect(setAccount).not.toHaveBeenCalled()
      expect(data).toEqual(mockRegistrationResponse)
    })

    it('should throw if client is not ready', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.createRegistration()).rejects.toThrow('BCSC client not ready for registration')
    })

    it('rejects with ACCOUNT_NOT_FOUND before any request when there is no account to hold the registration', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expectAppErrorRejection(result.current.createRegistration(), AppEventCode.ACCOUNT_NOT_FOUND)

      expect(getDynamicClientRegistrationBody).not.toHaveBeenCalled()
      expect(mockApiClient.post).not.toHaveBeenCalled()
      expect(mockSaveRegistration).not.toHaveBeenCalled()
    })

    it('rejects when the registration cannot be saved, so the caller never takes it for registered', async () => {
      const saveError = new Error('keychain write failed')
      mockSaveRegistration.mockRejectedValue(saveError)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.createRegistration()).rejects.toBe(saveError)
      expect(setAccount).not.toHaveBeenCalled()
    })

    it('should throw CLIENT_REGISTRATION_NULL when DCR body is null', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.createRegistration()

      await expectAppErrorRejection(promise, AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
    })

    it.each([
      [BcscNativeErrorCodes.KEYCHAIN_KEY_GENERATION_ERROR, AppEventCode.ERR_120_KEYCHAIN_KEY_GENERATION_ERROR],
      [BcscNativeErrorCodes.TOJSON_METHOD_FAILURE, AppEventCode.ERR_120_TOJSON_METHOD_FAILURE],
      [BcscNativeErrorCodes.TOJSONSTRING_METHOD_FAILURE, AppEventCode.ERR_120_TOJSONSTRING_METHOD_FAILURE],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_EXISTS, AppEventCode.ERR_120_KEYCHAIN_KEY_EXISTS_ERROR],
      [BcscNativeErrorCodes.KEYCHAIN_KEY_DOESNT_EXIST, AppEventCode.ERR_120_KEYCHAIN_KEY_DOESNT_EXIST_ERROR],
      [BcscNativeErrorCodes.KEYCHAIN_UNAVAILABLE, AppEventCode.ERR_120_KEYCHAIN_UNAVAILABLE_ERROR],
      [BcscNativeErrorCodes.JWT_DEVICE_INFO_ERROR, AppEventCode.ERR_120_JWT_DEVICE_INFO_ERROR],
    ])('should map native error code %s to AppError with appEvent %s', async (nativeCode, expectedAppEvent) => {
      const nativeError = { code: nativeCode, message: 'native error' } as unknown as BcscNativeError
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(nativeError)
      jest.mocked(isBcscNativeError).mockReturnValue(true)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.createRegistration()

      await expectAppErrorRejection(promise, expectedAppEvent)
    })

    it('maps an unmapped native error code to UNMAPPED_NATIVE_ERROR', async () => {
      const unknownError = { code: 'E_UNKNOWN', message: 'unknown native error' }
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(unknownError)
      jest.mocked(isBcscNativeError).mockReturnValue(true)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.createRegistration()

      await expectAppErrorRejection(promise, AppEventCode.UNMAPPED_NATIVE_ERROR)
    })

    it('maps a non-native error to UNMAPPED_NATIVE_ERROR', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockRejectedValue(new Error('generic JS error'))
      jest.mocked(isBcscNativeError).mockReturnValue(false)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.createRegistration()

      await expectAppErrorRejection(promise, AppEventCode.UNMAPPED_NATIVE_ERROR)
    })

    // -------------------------------------------------------------------------
    // Signing-key confirmation (#4166)
    // -------------------------------------------------------------------------
    describe('signing-key confirmation', () => {
      it('resolves and completes setup when the sent modulus is echoed among multiple server keys in a different encoding', async () => {
        jest
          .mocked(getDynamicClientRegistrationBody)
          .mockResolvedValue(JSON.stringify({ jwks: { keys: [{ n: SENT_N_IOS_SHAPE, kid: 'device-key' }] } }))
        mockApiClient.post.mockResolvedValue({
          data: {
            ...mockRegistrationResponse,
            jwks: {
              keys: [
                { kty: 'RSA', e: 'AQAB', kid: 'other-server-key', alg: 'RS512', n: toStdBase64([0x11, 0x22, 0x33]) },
                { kty: 'RSA', e: 'AQAB', kid: 'device-key', alg: 'RS512', n: SERVER_N_ANDROID_SHAPE },
              ],
            },
          },
        })

        const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

        const data = await result.current.createRegistration()

        expect(mockSaveRegistration).toHaveBeenCalled()
        expect(data.jwks.keys).toHaveLength(2)
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Confirmed sent signing key modulus is present in server jwks')
        )
      })

      it('throws ERR_121_REGISTRATION_KEY_NOT_CONFIRMED when the server jwks omits the sent modulus', async () => {
        jest
          .mocked(getDynamicClientRegistrationBody)
          .mockResolvedValue(JSON.stringify({ jwks: { keys: [{ n: SENT_N_IOS_SHAPE, kid: 'device-key' }] } }))
        mockApiClient.post.mockResolvedValue({
          data: {
            ...mockRegistrationResponse,
            jwks: {
              keys: [{ kty: 'RSA', e: 'AQAB', kid: 'device-key', alg: 'RS512', n: toStdBase64([0x11, 0x22, 0x33]) }],
            },
          },
        })

        const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

        const promise = result.current.createRegistration()

        await expectAppErrorRejection(promise, AppEventCode.ERR_121_REGISTRATION_KEY_NOT_CONFIRMED)

        expect(mockSaveRegistration).not.toHaveBeenCalled()
      })

      it('proceeds (warns only) when the sent registration body cannot be parsed as JSON', async () => {
        jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue('not valid json {{{')

        const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

        const data = await result.current.createRegistration()

        expect(data).toEqual(mockRegistrationResponse)
        expect(mockSaveRegistration).toHaveBeenCalled()
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Could not parse sent registration body to confirm signing key')
        )
      })

      it('proceeds (warns only) when neither the sent nor server jwks contain a decodable modulus', async () => {
        // Default mocks: DCR body has no jwks at all, and mockRegistrationResponse.jwks.keys is empty.
        const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

        const data = await result.current.createRegistration()

        expect(data).toEqual(mockRegistrationResponse)
        expect(mockSaveRegistration).toHaveBeenCalled()
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('unparseable/empty'))
      })
    })
  })

  // ---------------------------------------------------------------------------
  // register (with account guard)
  // ---------------------------------------------------------------------------
  describe('register', () => {
    it('should skip registration if the account already has a client ID', async () => {
      jest.mocked(getAccount).mockResolvedValue({ ...unregisteredAccount, clientID: 'existing-client' } as any)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.register()

      expect(data).toBeUndefined()
      expect(getDynamicClientRegistrationBody).not.toHaveBeenCalled()
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('should register an account that has no client ID yet', async () => {
      jest.mocked(getAccount).mockResolvedValue(unregisteredAccount as any)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.register()

      expect(getDynamicClientRegistrationBody).toHaveBeenCalled()
      expect(mockApiClient.post).toHaveBeenCalled()
      expect(mockSaveRegistration).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'test-client-id' }))
      expect(data).toEqual(mockRegistrationResponse)
    })

    it('rejects with ACCOUNT_NOT_FOUND, registering nothing, when no account exists', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expectAppErrorRejection(result.current.register(), AppEventCode.ACCOUNT_NOT_FOUND)
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // updateRegistration
  // ---------------------------------------------------------------------------
  describe('updateRegistration', () => {
    const existingAccount = {
      clientID: 'existing-client-id',
      issuer: 'https://mock-issuer.example.com',
      securityMethod: AccountSecurityMethod.PinWithDeviceAuth,
    }

    beforeEach(() => {
      jest.mocked(getAccount).mockResolvedValue(existingAccount as any)
      // The token the device holds for that client ID. It is read from storage, never passed in.
      jest.mocked(getToken).mockResolvedValue({ token: 'reg-access-token' } as any)
    })

    it('should complete update registration successfully', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.updateRegistration('NewNickname')

      expect(getToken).toHaveBeenCalledWith(TokenType.Registration)

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
      // The returned registration is saved in one step, and before the nickname
      expect(mockSaveRegistration).toHaveBeenCalledWith({
        clientId: mockRegistrationResponse.client_id,
        issuer: mockApiClient.endpoints.issuer,
        registrationAccessToken: mockRegistrationResponse.registration_access_token,
      })
      // Saving the account carries the nickname only: it cannot change the client ID
      expect(setAccount).toHaveBeenCalledWith({
        issuer: mockApiClient.endpoints.issuer,
        securityMethod: AccountSecurityMethod.PinWithDeviceAuth,
        nickname: 'NewNickname',
        didPostNicknameToServer: true,
      })
      expect(mockSaveRegistration.mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(setAccount).mock.invocationCallOrder[0]
      )
      expect(data).toEqual(mockRegistrationResponse)
    })

    it('keeps the token the request was made with when the response carries none', async () => {
      mockApiClient.put.mockResolvedValue({
        data: { ...mockRegistrationResponse, registration_access_token: undefined },
      })

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await result.current.updateRegistration('NewNickname')

      expect(mockSaveRegistration).toHaveBeenCalledWith(
        expect.objectContaining({ registrationAccessToken: 'reg-access-token' })
      )
    })

    it('saves a rotated token with the client ID the request was made for when the response names none', async () => {
      mockApiClient.put.mockResolvedValue({
        data: { ...mockRegistrationResponse, client_id: undefined },
      })

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await result.current.updateRegistration('NewNickname')

      expect(mockSaveRegistration).toHaveBeenCalledWith({
        clientId: existingAccount.clientID,
        issuer: mockApiClient.endpoints.issuer,
        registrationAccessToken: mockRegistrationResponse.registration_access_token,
      })
    })

    it('should throw if client is not ready (with existing account)', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.updateRegistration('nickname')).rejects.toThrow(
        'BCSC client not ready for registration update'
      )
    })

    it('should throw if no account exists and client is not ready', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.updateRegistration('nickname')).rejects.toThrow(
        'No account found. Please register first.'
      )
    })

    it('should throw if the device holds no registration access token', async () => {
      jest.mocked(getToken).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('nickname')).rejects.toThrow(
        'No registration access token found for registration update'
      )
      expect(mockApiClient.put).not.toHaveBeenCalled()
    })

    it('should throw if no nickname is provided', async () => {
      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration(undefined)).rejects.toThrow(
        'No client name found for registration update'
      )
    })

    it('should throw ACCOUNT_NOT_REGISTERED for an account that has no client ID', async () => {
      jest.mocked(getAccount).mockResolvedValue(unregisteredAccount as any)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expectAppErrorRejection(result.current.updateRegistration('nickname'), AppEventCode.ACCOUNT_NOT_REGISTERED)
    })

    it('should throw if no account exists', async () => {
      jest.mocked(getAccount).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('nickname')).rejects.toThrow(
        'No account found. Please register first.'
      )
    })

    it('should throw CLIENT_REGISTRATION_NULL when DCR body is null', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue(null)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.updateRegistration('nickname')

      await expectAppErrorRejection(promise, AppEventCode.ERR_102_CLIENT_REGISTRATION_UNEXPECTEDLY_NULL)
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

      const promise = result.current.updateRegistration('nickname')

      await expectAppErrorRejection(promise, expectedAppEvent)
    })

    it('should throw DESERIALIZE_JSON_ERROR when body cannot be parsed as JSON', async () => {
      jest.mocked(getDynamicClientRegistrationBody).mockResolvedValue('not valid json {{{')

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const promise = result.current.updateRegistration('nickname')

      await expectAppErrorRejection(promise, AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)
    })

    it('should propagate API errors from the PUT request', async () => {
      mockApiClient.put.mockRejectedValue(new Error('Server unavailable'))

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('nickname')).rejects.toThrow('Server unavailable')
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update registration'))
    })

    it('rejects with the save failure, after saving the nickname, when the registration cannot be saved', async () => {
      const saveError = new Error('storage write failure')
      mockSaveRegistration.mockRejectedValue(saveError)

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      // Not a success: the server may have rotated the token and revoked the one the device still holds
      await expect(result.current.updateRegistration('nickname')).rejects.toBe(saveError)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store updated registration data')
      )
      expect(setAccount).toHaveBeenCalledWith(expect.objectContaining({ nickname: 'nickname' }))
    })

    it('should still return data, with the registration saved, when the nickname cannot be saved', async () => {
      jest.mocked(setAccount).mockRejectedValue(new Error('storage write failure'))

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const data = await result.current.updateRegistration('nickname')

      expect(data).toEqual(mockRegistrationResponse)
      expect(mockSaveRegistration).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to store updated account nickname'))
    })

    it('rejects with the registration save failure, not the nickname one, when both saves fail', async () => {
      const saveError = new Error('registration write failure')
      mockSaveRegistration.mockRejectedValue(saveError)
      jest.mocked(setAccount).mockRejectedValue(new Error('nickname write failure'))

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      await expect(result.current.updateRegistration('nickname')).rejects.toBe(saveError)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store updated registration data')
      )
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to store updated account nickname'))
    })
  })

  // ---------------------------------------------------------------------------
  // deleteRegistration
  // ---------------------------------------------------------------------------
  describe('deleteRegistration', () => {
    it('should return success for 2xx status codes', async () => {
      mockApiClient.delete.mockResolvedValue({ status: 204 })

      const { result } = renderHook(() => useRegistrationApi(mockApiClient as any))

      const response = await result.current.deleteRegistration('mock-reg-token', 'client-to-delete')

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

      const response = await result.current.deleteRegistration('mock-reg-token', 'client-to-delete')

      expect(response).toEqual({ success: false })
    })

    it('should throw if client is not ready', async () => {
      const { result } = renderHook(() => useRegistrationApi(null, false))

      await expect(result.current.deleteRegistration('mock-reg-token', 'client-to-delete')).rejects.toThrow(
        'BCSC client not ready for registration deletion'
      )
    })
  })
})
