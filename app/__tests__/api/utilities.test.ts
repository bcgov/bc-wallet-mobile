import { Platform } from 'react-native'
import apiClient from '../../src/api/client'
import { getServerStatus, getTermsOfUse } from '../../src/api/services/utility.service'

jest.mock('../../src/api/client', () => ({
  get: jest.fn(),
}))

describe('utility.service', () => {
  beforeEach(() => {
    Platform.OS = 'ios'
  })
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getServerStatus', () => {
    it('calls the correct endpoint for android', async () => {
      Platform.OS = 'android'
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      const response = await getServerStatus()

      expect(apiClient.get).toHaveBeenCalledWith('/cardtap/v3/status/android/mobile_card')
      expect(response).toEqual({ data: { status: 'ok' } })
    })

    it('calls the correct endpoint for ios', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'ok' } })
      const response = await getServerStatus()

      expect(apiClient.get).toHaveBeenCalledWith('/cardtap/v3/status/ios/mobile_card')
      expect(response).toEqual({ data: { status: 'ok' } })
    })

    it('handles API errors gracefully', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(getServerStatus()).rejects.toThrow('Network error')
    })
  })

  describe('getTermsOfUse', () => {
    it('calls the correct endpoint', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { terms: 'Sample terms' } })
      const response = await getTermsOfUse()

      expect(apiClient.get).toHaveBeenCalledWith('/cardtap/v3/terms')
      expect(response).toEqual({ data: { terms: 'Sample terms' } })
    })

    it('handles API errors gracefully', async () => {
      // Mock API error
      ;(apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Call the function and expect it to throw
      await expect(getTermsOfUse()).rejects.toThrow('Network error')
    })
  })
})
