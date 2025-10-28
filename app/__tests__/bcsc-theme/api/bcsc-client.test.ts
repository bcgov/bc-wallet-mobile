import BCSCApiClient from '@/bcsc-theme/api/client'
import { AxiosResponse } from 'axios'

describe('BCSC Client', () => {
  it('should suppress logging for status codes if suppressStatusCodeLogs prop is set', async () => {
    const mockLogger = { error: jest.fn(), info: jest.fn() }
    const baseURL = 'https://example.com'

    const client = new BCSCApiClient(baseURL, mockLogger as any)

    const axiosGetSpy = jest.spyOn(client.client, 'get').mockRejectedValue({
      data: {
        response: {
          status: 404,
        },
      },
    })

    try {
      await client.get('/endpoint', { suppressStatusCodeLogs: [404] })
      expect(true).toBe(false) // Force fail if no error is thrown
    } catch (error) {
      expect(axiosGetSpy).toHaveBeenCalledWith(
        '/endpoint',
        expect.objectContaining({
          suppressStatusCodeLogs: [404],
        })
      )

      expect(mockLogger.error).not.toHaveBeenCalled()
    }
  })

  it('should log error for status codes not in suppressStatusCodeLogs', async () => {
    const mockLogger = { error: jest.fn(), info: jest.fn() }
    const baseURL = 'https://example.com'

    const client = new BCSCApiClient(baseURL, mockLogger as any)

    const axiosGetSpy = jest.spyOn(client.client, 'get')

    try {
      await client.get('/endpoint', { suppressStatusCodeLogs: [404] })
      expect(true).toBe(false) // Force fail if no error is thrown
    } catch (error) {
      expect(axiosGetSpy).toHaveBeenCalledWith(
        '/endpoint',
        expect.objectContaining({
          suppressStatusCodeLogs: [404],
        })
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'IAS API Error',
        expect.objectContaining({ name: expect.any(String) })
      )
    }
  })

  describe('getTokensForRefreshToken', () => {
    it('should return the promise if already exists', async () => {
      const mockLogger = { info: jest.fn() }
      const baseURL = 'https://example.com'
      const client = new BCSCApiClient(baseURL, mockLogger as any)

      const mockPromise = new Promise((resolve) => {
        setTimeout(() => resolve('tokens'), 100)
      })
      client.tokensPromise = mockPromise as any

      const tokensPromise1 = client.getTokensForRefreshToken('refreshToken1')
      const tokensPromise2 = client.getTokensForRefreshToken('refreshToken2')

      expect(await tokensPromise1).toBe('tokens')
      expect(await tokensPromise2).toBe('tokens')
    })

    it('should fetch new tokens if no existing promise', async () => {
      const mockLogger = { info: jest.fn() }
      const baseURL = 'https://example.com'
      const client = new BCSCApiClient(baseURL, mockLogger as any)

      const mockTokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      }

      const privateFetchTokens = jest.spyOn(BCSCApiClient.prototype as any, 'fetchTokens').mockResolvedValue(mockTokens)

      const tokens = client.getTokensForRefreshToken('refreshToken1')
      expect(client.tokensPromise).toBeInstanceOf(Promise)
      expect(client.tokens).toBeUndefined()

      await tokens

      expect(privateFetchTokens).toHaveBeenCalledWith('refreshToken1')
      expect(client.tokens).toBe(mockTokens)
      expect(client.tokensPromise).toBeNull()
    })
  })
})
