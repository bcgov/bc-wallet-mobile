import useUserApi from '@/bcsc-theme/api/hooks/useUserApi'
import { AppError, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { act, renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'

const mockJwk = { kty: 'RSA', e: 'AQAB', kid: 'test-kid', alg: 'RS256', n: 'test-modulus' }

describe('useUserApi', () => {
  describe('getUserInfo', () => {
    it('should wrap native E_FAILED_TO_PARSE_JWS as DECRYPT_JWE_ERROR', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        fetchJwk: jest.fn().mockResolvedValue(mockJwk),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      const nativeError = Object.assign(new Error('Invalid JWS'), { code: 'E_FAILED_TO_PARSE_JWS' })
      decodePayloadMock.mockRejectedValue(nativeError)

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        await expect(hook.result.current.getUserInfo()).rejects.toThrow(
          AppError.fromErrorDefinition(ErrorRegistry.DECRYPT_JWE_ERROR, { cause: nativeError })
        )
      })
    })

    it('should fetch user info successfully', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        fetchJwk: jest.fn().mockResolvedValue(mockJwk),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue({ verified: true, claims: JSON.stringify({ given_name: 'steve brule' }) })

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        const user = await hook.result.current.getUserInfo()

        expect(user.given_name).toBe('steve brule')
      })
    })

    it('should throw ERR_111 when verification fails and no JWK is available', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        fetchJwk: jest.fn().mockResolvedValue(null),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue({ verified: false, claims: '{}' })

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        await expect(hook.result.current.getUserInfo()).rejects.toThrow(
          expect.objectContaining({
            appEvent: AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK,
          })
        )
      })
    })

    it('should throw ERR_112 when verification fails and a JWK is available', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        fetchJwk: jest.fn().mockResolvedValue(mockJwk),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue({ verified: false, claims: '{}' })

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        await expect(hook.result.current.getUserInfo()).rejects.toThrow(
          expect.objectContaining({
            appEvent: AppEventCode.ERR_112_JWS_VERIFICATION_FAILED,
          })
        )
      })
    })

    it('should throw ERR_114 when decoded payload is null', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        fetchJwk: jest.fn().mockResolvedValue(mockJwk),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue({ verified: true, claims: 'null' })

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        await expect(hook.result.current.getUserInfo()).rejects.toThrow(
          expect.objectContaining({
            appEvent: AppEventCode.ERR_114_FAILED_TO_GET_CLAIMS_SET_AFTER_DECRYPT_AND_VERIFY,
          })
        )
      })
    })
  })

  describe('getPicture', () => {
    it('should fetch and convert picture to base64 URI', async () => {
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        endpoints: {
          userInfo: '/user/info',
        },
      }
      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]) // "Hello" in ASCII
      mockApiClient.get.mockResolvedValue({ data: binaryData.buffer })

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        const pictureUri = await hook.result.current.getPicture('http://example.com/pic.jpg')
        expect(pictureUri).toBe('data:image/jpeg;base64,SGVsbG8=')
      })
    })
  })
})
