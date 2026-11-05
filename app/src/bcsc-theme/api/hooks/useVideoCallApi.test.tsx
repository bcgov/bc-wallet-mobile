import { getAppErrorFromAxiosError } from '@/bcsc-theme/utils/axios-error-utils'
import { renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { createPreVerificationJWT } from 'react-native-bcsc-core'
import useVideoCallApi from './useVideoCallApi'
import { withAccount } from './withAccountGuard'

jest.mock('@bifold/core', () => ({
  useStore: () => [{ bcscSecure: { deviceCode: 'mock-device-code' } }],
}))

jest.mock('react-native-bcsc-core', () => ({
  createPreVerificationJWT: jest.fn(),
}))

jest.mock('./withAccountGuard', () => ({
  withAccount: jest.fn(),
}))

// Mirrors production: the axios message carries only the status, the server text is in response.data
const buildAppError = (status: number, data: string) => {
  const axiosError = new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    { status, data, statusText: '', headers: {}, config: {} as any }
  )
  return getAppErrorFromAxiosError(axiosError)
}

describe('useVideoCallApi', () => {
  describe('endVideoSession', () => {
    it('deletes the session with the pre-verification token and quiet error handling', async () => {
      const mockApiClient = {
        endpoints: { video: 'https://mock-api.example.com/video' },
        delete: jest.fn().mockResolvedValue({ data: undefined }),
      } as any
      jest.mocked(withAccount).mockImplementation(async (callback) => callback({ clientID: 'mock-client-id' } as any))
      jest.mocked(createPreVerificationJWT).mockResolvedValue('mock-jwt')

      const { result } = renderHook(() => useVideoCallApi(mockApiClient))
      await result.current.endVideoSession('1711469')

      expect(createPreVerificationJWT).toHaveBeenCalledWith('mock-device-code', 'mock-client-id')
      expect(mockApiClient.delete).toHaveBeenCalledWith('https://mock-api.example.com/video/v2/sessions/1711469', {
        headers: { Authorization: 'Bearer mock-jwt' },
        skipBearerAuth: true,
        skipOnErrorHandler: true,
        suppressStatusCodeLogs: [404],
      })
    })

    it.each(['SESSION_TIMED_OUT', 'SESSION_ENDED'])('resolves when the session already ended (%s)', async (status) => {
      const mockApiClient = {
        endpoints: { video: 'https://mock-api.example.com/video' },
        delete: jest
          .fn()
          .mockRejectedValue(buildAppError(404, `Video session is not in an active state. Current status: ${status}`)),
      } as any
      jest.mocked(withAccount).mockImplementation(async (callback) => callback({ clientID: 'mock-client-id' } as any))
      jest.mocked(createPreVerificationJWT).mockResolvedValue('mock-jwt')

      const { result } = renderHook(() => useVideoCallApi(mockApiClient))

      await expect(result.current.endVideoSession('1711469')).resolves.toBeUndefined()
    })

    it('rethrows a 404 that is not about an ended session', async () => {
      const appError = buildAppError(404, '<!doctype html><html></html>')
      const mockApiClient = {
        endpoints: { video: 'https://mock-api.example.com/video' },
        delete: jest.fn().mockRejectedValue(appError),
      } as any
      jest.mocked(withAccount).mockImplementation(async (callback) => callback({ clientID: 'mock-client-id' } as any))
      jest.mocked(createPreVerificationJWT).mockResolvedValue('mock-jwt')

      const { result } = renderHook(() => useVideoCallApi(mockApiClient))

      await expect(result.current.endVideoSession('1711469')).rejects.toBe(appError)
    })

    it('rethrows other failures', async () => {
      const appError = buildAppError(500, 'Internal Server Error')
      const mockApiClient = {
        endpoints: { video: 'https://mock-api.example.com/video' },
        delete: jest.fn().mockRejectedValue(appError),
      } as any
      jest.mocked(withAccount).mockImplementation(async (callback) => callback({ clientID: 'mock-client-id' } as any))
      jest.mocked(createPreVerificationJWT).mockResolvedValue('mock-jwt')

      const { result } = renderHook(() => useVideoCallApi(mockApiClient))

      await expect(result.current.endVideoSession('1711469')).rejects.toBe(appError)
    })
  })
})
