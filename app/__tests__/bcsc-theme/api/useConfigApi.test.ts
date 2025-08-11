import { Platform } from 'react-native'
import { renderHook } from '@testing-library/react-native'

jest.mock('@bcsc-theme/api/client', () => {
  return {
    baseURL: 'https://mock-api-base-url.com',
    get: jest.fn().mockImplementation(() => Promise.resolve({ data: {} })),
  }
})

import apiClient from '@bcsc-theme/api/client'
import useConfigApi from '@bcsc-theme/api/hooks/useConfigApi'

describe('useConfigApi', () => {
  beforeEach(() => {
    Platform.OS = 'ios'
    jest.clearAllMocks()
  })

  const config = renderHook(() => useConfigApi()).result.current

  describe('getServerStatus', () => {
    it('calls the correct endpoint for android', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      Platform.OS = 'android'

      // Call the method we're testing
      const response = await config.getServerStatus()

      // Verify correct endpoint called with the mocked baseURL
      expect(apiClient.get).toHaveBeenCalledWith(`${apiClient.baseURL}/cardtap/v3/status/android/mobile_card`, {
        skipBearerAuth: true,
      })
      expect(response).toEqual({ status: 'ok' })
    })

    it('calls the correct endpoint for ios', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      const response = await config.getServerStatus()

      expect(apiClient.get).toHaveBeenCalledWith(`${apiClient.baseURL}/cardtap/v3/status/ios/mobile_card`, {
        skipBearerAuth: true,
      })
      expect(response).toEqual({ status: 'ok' })
    })

    it('handles API errors gracefully', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      await expect(config.getServerStatus()).rejects.toThrow('Network error')
    })
  })

  describe('getTermsOfUse', () => {
    it('calls the correct endpoint', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { terms: 'Sample terms' } })
      const response = await config.getTermsOfUse()

      expect(apiClient.get).toHaveBeenCalledWith(`${apiClient.baseURL}/cardtap/v3/terms`)
      expect(response).toEqual({ terms: 'Sample terms' })
    })

    it('handles API errors gracefully', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      await expect(config.getTermsOfUse()).rejects.toThrow('Network error')
    })
  })
})
