import useUserApi from '@/bcsc-theme/api/hooks/useUserApi'
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

  describe('getUserMetadata', () => {
    it('should return both the user and the picture', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        endpoints: {
          userInfo: '/user/info',
        },
      }
      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]) // "Hello" in ASCII
      mockApiClient.get
        .mockResolvedValueOnce({ data: 'encoded-data' }) // first call for user info
        .mockResolvedValueOnce({ data: binaryData.buffer }) // second call for picture
      decodePayloadMock.mockResolvedValue(
        JSON.stringify({ given_name: 'steve brule', picture: 'http://example.com/pic.jpg' })
      )
      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        const { user, picture } = await hook.result.current.getUserMetadata()
        expect(user.given_name).toBe('steve brule')
        expect(picture).toBe('data:image/jpeg;base64,SGVsbG8=')
      })
    })

    it('should return just the user when no picture exists', async () => {
      const decodePayloadMock = jest.mocked(BcscCore).decodePayload
      const getAccountMock = jest.mocked(BcscCore).getAccount

      const mockApiClient = {
        get: jest.fn(),
        endpoints: {
          userInfo: '/user/info',
        },
      }
      getAccountMock.mockResolvedValue({ clientID: 'test' } as any)
      mockApiClient.get.mockResolvedValue({ data: 'encoded-data' }) // call for user info
      decodePayloadMock.mockResolvedValue(JSON.stringify({ given_name: 'steve brule' })) // no picture field
      const hook = renderHook(() => useUserApi(mockApiClient as any))

      await act(async () => {
        const { user, picture } = await hook.result.current.getUserMetadata()
        expect(user.given_name).toBe('steve brule')
        expect(picture).toBeUndefined()
      })
    })
  })
})
