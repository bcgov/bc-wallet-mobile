import useConfigApi from '@bcsc-theme/api/hooks/useConfigApi'
import { renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'

const mockApiClient = {
  baseURL: 'https://mock-api-base-url.com',
  get: jest.fn().mockImplementation(() => Promise.resolve({ data: {} })),
}

describe('useConfigApi', () => {
  beforeEach(() => {
    Platform.OS = 'ios'
    jest.clearAllMocks()
  })

  const config = renderHook(() => useConfigApi(mockApiClient as any)).result.current

  describe('getServerStatus', () => {
    it('calls the correct endpoint for android', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(mockApiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      Platform.OS = 'android'

      // Call the method we're testing
      const response = await config.getServerStatus()

      // Verify correct endpoint called with the mocked baseURL
      expect(mockApiClient.get).toHaveBeenCalledWith(`${mockApiClient.baseURL}/cardtap/v3/status/android/mobile_card`, {
        skipBearerAuth: true,
      })
      expect(response).toEqual({ status: 'ok' })
    })

    it('calls the correct endpoint for ios', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(mockApiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      const response = await config.getServerStatus()

      expect(mockApiClient.get).toHaveBeenCalledWith(`${mockApiClient.baseURL}/cardtap/v3/status/ios/mobile_card`, {
        skipBearerAuth: true,
      })
      expect(response).toEqual({ status: 'ok' })
    })

    it('handles API errors gracefully', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(mockApiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      await expect(config.getServerStatus()).rejects.toThrow('Network error')
    })
  })

  describe('getTermsOfUse', () => {
    it('calls the correct endpoint', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(mockApiClient.get as jest.Mock).mockResolvedValueOnce({ data: { terms: 'Sample terms' } })
      const response = await config.getTermsOfUse()

      expect(mockApiClient.get).toHaveBeenCalledWith(`${mockApiClient.baseURL}/cardtap/v3/terms`)
      expect(response).toEqual({ terms: 'Sample terms' })
    })

    it('handles API errors gracefully', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(mockApiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      await expect(config.getTermsOfUse()).rejects.toThrow('Network error')
    })
  })
})
