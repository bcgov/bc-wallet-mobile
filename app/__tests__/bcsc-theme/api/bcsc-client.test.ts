import BCSCApiClient from '@/bcsc-theme/api/client'

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
})
