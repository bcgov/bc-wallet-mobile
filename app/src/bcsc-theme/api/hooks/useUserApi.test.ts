import useUserApi from '@/bcsc-theme/api/hooks/useUserApi'
import { AppError, ErrorRegistry } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { act, renderHook } from '@testing-library/react-native'
import * as BcscCore from 'react-native-bcsc-core'

describe('useUserApi', () => {
  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue(JSON.stringify({ given_name: 'steve brule' }))

      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        const user = await hook.result.current.getUserInfo()

        expect(user.given_name).toBe('steve brule')
      })
    })

    it('should throw ERR_114 when decoded payload is null', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        endpoints: {
          userInfo: '/user/info',
        },
      }

      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' })
      decodePayloadMock.mockResolvedValue('null')

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
