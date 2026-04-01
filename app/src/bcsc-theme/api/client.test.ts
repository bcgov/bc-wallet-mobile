import BCSCApiClient from '@/bcsc-theme/api/client'
import { AppError } from '@/errors/appError'
import { ErrorCategory } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { localization } from '@/localization'
import { initLanguages } from '@bifold/core'
import { AxiosError } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { getAccount } from 'react-native-bcsc-core'

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}))

describe('BCSC Client', () => {
  beforeAll(() => {
    initLanguages(localization)
  })

  it('should set Content-Type default header to application/json with charset=utf-8', () => {
    const mockLogger = { info: jest.fn(), error: jest.fn() }
    const client = new BCSCApiClient('https://example.com', mockLogger as any)

    expect(client.client.defaults.headers['Content-Type']).toBe('application/json; charset=utf-8')
  })

  it('should set User-Agent default header', () => {
    const mockLogger = { info: jest.fn(), error: jest.fn() }
    const client = new BCSCApiClient('https://example.com', mockLogger as any)

    expect(client.client.defaults.headers['User-Agent']).toBeDefined()
  })

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

    // Mock adapter to produce a proper AxiosError so interceptors run but no real HTTP call is made
    client.client.defaults.adapter = (config: any) => {
      return Promise.reject(
        new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {} as any,
          config,
        })
      )
    }

    const axiosGetSpy = jest.spyOn(client.client, 'get')

    try {
      await client.get('/endpoint', { suppressStatusCodeLogs: [404], skipBearerAuth: true })
      expect(true).toBe(false) // Force fail if no error is thrown
    } catch (error) {
      expect(axiosGetSpy).toHaveBeenCalledWith(
        '/endpoint',
        expect.objectContaining({
          suppressStatusCodeLogs: [404],
        })
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[BCSCApiClient]'),
        expect.objectContaining({ code: expect.any(String) })
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

  it('should log error when initialized with empty URL', () => {
    const mockLogger = { info: jest.fn(), error: jest.fn() }
    const client = new BCSCApiClient('', mockLogger as any)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('initialized with empty URL'))
    expect(client.baseURL).toBe('')
  })

  describe('clearTokens', () => {
    it('should clear tokens and tokensPromise', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      client.tokens = { access_token: 'a', refresh_token: 'r' } as any
      client.tokensPromise = Promise.resolve({} as any)

      client.clearTokens()

      expect(client.tokens).toBeUndefined()
      expect(client.tokensPromise).toBeNull()
    })
  })

  describe('setErrorHandler', () => {
    it('should set the onError callback', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const handler = jest.fn()

      client.setErrorHandler(handler)

      expect(client.onError).toBe(handler)
    })
  })

  describe('response interceptor', () => {
    it('should pass through AppError instances without re-wrapping', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const appError = new AppError('test error', {
        category: ErrorCategory.GENERAL,
        appEvent: AppEventCode.ERR_100_FAILED_TO_WRITE_LOCAL_STORAGE,
        statusCode: 1000,
      })

      client.client.defaults.adapter = () => {
        return Promise.reject(appError)
      }

      await expect(client.get('/endpoint', { skipBearerAuth: true })).rejects.toThrow(appError)
    })

    it('should pass through non-AxiosError instances unchanged', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const genericError = new TypeError('something broke')

      client.client.defaults.adapter = () => {
        return Promise.reject(genericError)
      }

      await expect(client.get('/endpoint', { skipBearerAuth: true })).rejects.toThrow(genericError)
    })

    it('should call onError handler and log error on handled onError callback failure', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const handlerError = new Error('handler blew up')
      client.setErrorHandler(() => {
        throw handlerError
      })

      client.client.defaults.adapter = (config: any) => {
        return Promise.reject(
          new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
            status: 500,
            data: {},
            statusText: 'Internal Server Error',
            headers: {} as any,
            config,
          })
        )
      }

      await expect(client.get('/endpoint', { skipBearerAuth: true })).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalledWith('[BCSCApiClient] Error handler threw', handlerError)
    })
  })

  describe('fetchEndpointsAndConfig', () => {
    it('should merge server config and endpoints into client', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      jest.spyOn(client, 'get').mockResolvedValue({
        data: {
          pair_device_with_qrcode_supported: false,
          maximum_accounts_per_device: 5,
          allowed_identification_processes: ['process1'],
          credential_flows_supported: 'flow1',
          multiple_accounts_supported: true,
          attestation_time_to_live: 120,
          attestation_endpoint: 'https://example.com/attestation-new',
          issuer: 'https://example.com/issuer-new',
          authorization_endpoint: 'https://example.com/auth-new',
          userinfo_endpoint: 'https://example.com/userinfo-new',
          device_authorization_endpoint: 'https://example.com/deviceauth-new',
          jwks_uri: 'https://example.com/jwks-new',
          registration_endpoint: 'https://example.com/reg-new',
          client_metadata_endpoint: 'https://example.com/metadata-new',
          saved_services_endpoint: 'https://example.com/services-new',
          token_endpoint: 'https://example.com/token-new',
          credential_endpoint: 'https://example.com/credential-new',
          evidence_endpoint: 'https://example.com/evidence-new',
          video_call_endpoint: 'https://example.com/video-new',
          cardtap_endpoint: 'https://example.com/cardtap-new',
          barcodes_endpoint: 'https://example.com/barcodes-new',
          account_devices_endpoint: 'https://example.com/devices-new',
          account_endpoint: 'https://example.com/account-new',
        },
      } as any)

      await client.fetchEndpointsAndConfig()

      expect(client.config.pairDeviceWithQRCodeSupported).toBe(false)
      expect(client.config.maximumAccountsPerDevice).toBe(5)
      expect(client.config.multipleAccountsSupported).toBe(true)
      expect(client.config.attestationTimeToLive).toBe(120)
      expect(client.endpoints.attestation).toBe('https://example.com/attestation-new')
      expect(client.endpoints.token).toBe('https://example.com/token-new')
      expect(client.endpoints.video).toBe('https://example.com/video-new')
    })
  })

  describe('isTokenExpired', () => {
    it('should return true when no token is provided', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const result = (client as any).isTokenExpired(undefined)

      expect(result).toBe(true)
    })

    it('should return false when token has not expired', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      // Token expires far in the future
      ;(jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 })

      const result = (client as any).isTokenExpired('valid-token')

      expect(result).toBe(false)
    })

    it('should return true when token is within buffer of expiring', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      // Token expires in 20 seconds (within 30s buffer)
      ;(jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 20 })

      const result = (client as any).isTokenExpired('expiring-token')

      expect(result).toBe(true)
    })

    it('should return true when token has no exp claim', () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      ;(jwtDecode as jest.Mock).mockReturnValue({})

      const result = (client as any).isTokenExpired('no-exp-token')

      expect(result).toBe(true)
    })
  })

  describe('ensureValidTokens', () => {
    it('should return existing promise if tokens are already being refreshed', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const mockTokens = { access_token: 'a', refresh_token: 'r' }
      client.tokensPromise = Promise.resolve(mockTokens as any)
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      const result = await (client as any).ensureValidTokens()

      expect(result).toEqual(mockTokens)
    })

    it('should throw when tokens are missing', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      client.tokens = undefined
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      await expect((client as any).ensureValidTokens()).rejects.toThrow()
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Missing tokens'))
    })

    it('should throw when refresh token is expired', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      client.tokens = { access_token: 'a', refresh_token: 'r' } as any
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      // Both tokens expired
      ;(jwtDecode as jest.Mock).mockReturnValue({ exp: 0 })

      await expect((client as any).ensureValidTokens()).rejects.toThrow('Refresh token expired')
    })

    it('should return tokens when access token is still valid', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const mockTokens = { access_token: 'a', refresh_token: 'r' }
      client.tokens = mockTokens as any
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      // Both tokens valid (far future)
      ;(jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 })

      const result = await (client as any).ensureValidTokens()

      expect(result).toBe(mockTokens)
    })

    it('should refresh tokens when access token is expired but refresh token is valid', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const oldTokens = { access_token: 'old-access', refresh_token: 'valid-refresh' }
      const newTokens = { access_token: 'new-access', refresh_token: 'new-refresh' }
      client.tokens = oldTokens as any
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      // First call (refresh_token) -> valid, second call (access_token) -> expired
      ;(jwtDecode as jest.Mock)
        .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 3600 }) // refresh token valid
        .mockReturnValueOnce({ exp: 0 }) // access token expired

      jest.spyOn(BCSCApiClient.prototype as any, 'fetchTokens').mockResolvedValue(newTokens)

      const result = await (client as any).ensureValidTokens()

      expect(result).toEqual(newTokens)
      expect(client.tokens).toEqual(newTokens)
      expect(client.tokensPromise).toBeNull()
    })
  })

  describe('handleRequest', () => {
    it('should skip bearer auth when skipBearerAuth is set', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const config = {
        url: '/test',
        method: 'get',
        headers: { set: jest.fn() },
        skipBearerAuth: true,
      }

      const result = await (client as any).handleRequest(config)

      expect(result).toBe(config)
      expect(config.headers.set).not.toHaveBeenCalled()
    })

    it('should add bearer auth header when skipBearerAuth is not set', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      client.tokens = { access_token: 'my-token', refresh_token: 'r' } as any
      ;(getAccount as jest.Mock).mockResolvedValue({ issuer: 'iss', clientID: 'cid' })

      // Token is valid
      ;(jwtDecode as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 })

      const config = {
        url: '/test',
        method: 'get',
        headers: { set: jest.fn() },
      }

      await (client as any).handleRequest(config)

      expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer my-token')
    })
  })

  describe('HTTP methods', () => {
    it('should delegate post to client.post', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const mockResponse = { data: 'ok' }

      jest.spyOn(client.client, 'post').mockResolvedValue(mockResponse)

      const result = await client.post('/endpoint', { key: 'value' })

      expect(client.client.post).toHaveBeenCalledWith('/endpoint', { key: 'value' }, undefined)
      expect(result).toBe(mockResponse)
    })

    it('should delegate put to client.put', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const mockResponse = { data: 'ok' }

      jest.spyOn(client.client, 'put').mockResolvedValue(mockResponse)

      const result = await client.put('/endpoint', { key: 'value' })

      expect(client.client.put).toHaveBeenCalledWith('/endpoint', { key: 'value' }, undefined)
      expect(result).toBe(mockResponse)
    })

    it('should delegate delete to client.delete', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)
      const mockResponse = { data: 'ok' }

      jest.spyOn(client.client, 'delete').mockResolvedValue(mockResponse)

      const result = await client.delete('/endpoint')

      expect(client.client.delete).toHaveBeenCalledWith('/endpoint', undefined)
      expect(result).toBe(mockResponse)
    })
  })

  describe('fetchJwk', () => {
    it('should return the first JWK from the JWKS endpoint', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      const mockJwk = { kty: 'RSA', kid: 'key-1' }
      jest.spyOn(client, 'get').mockResolvedValue({
        data: { keys: [mockJwk, { kty: 'RSA', kid: 'key-2' }] },
      } as any)

      const result = await client.fetchJwk()

      expect(result).toEqual(mockJwk)
    })

    it('should return null when JWKS endpoint returns empty keys array', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      jest.spyOn(client, 'get').mockResolvedValue({
        data: { keys: [] },
      } as any)

      const result = await client.fetchJwk()

      expect(result).toBeNull()
    })

    it('should return null and log error when JWKS fetch fails', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      jest.spyOn(client, 'get').mockRejectedValue(new Error('Network error'))

      const result = await client.fetchJwk()

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch JWK'))
    })

    it('should return null when keys property is undefined', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const client = new BCSCApiClient('https://example.com', mockLogger as any)

      jest.spyOn(client, 'get').mockResolvedValue({
        data: {},
      } as any)

      const result = await client.fetchJwk()

      expect(result).toBeNull()
    })
  })

  describe('tokens race condition smoke test', () => {
    it('should never have stale tokens when multiple requests are made simultaneously', async () => {
      const mockLogger = { info: jest.fn(), error: jest.fn() }
      const baseURL = 'https://example.com'

      const client = new BCSCApiClient(baseURL, mockLogger as any)

      jest.spyOn(client.client, 'get').mockResolvedValue({ data: 'response' })

      const mockInitialTokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      }

      const mockRefreshedTokens = {
        access_token: 'newAccessToken',
        refresh_token: 'newRefreshToken',
      }

      jest
        .spyOn(BCSCApiClient.prototype as any, 'fetchTokens')
        .mockResolvedValueOnce(mockInitialTokens)
        .mockResolvedValueOnce(mockRefreshedTokens)

      // Initialize tokens
      await client.getTokensForRefreshToken('initialRefreshToken')
      await client.get('/endpointA')
      expect(client.tokens).toBe(mockInitialTokens)
      expect(client.tokensPromise).toBeNull()

      // Trigger refresh
      const tokenRefresh = client.getTokensForRefreshToken('newRefreshToken')
      expect(client.tokens).toBe(mockInitialTokens)
      expect(client.tokensPromise).toBeInstanceOf(Promise)

      // Parallel request during refresh
      const clientReqB = client.get('/endpointB')

      // Wait for refresh completion
      await tokenRefresh
      expect(client.tokens).toBe(mockRefreshedTokens)
      expect(client.tokensPromise).toBeNull()

      // Request after refresh
      const clientReqC = client.get('/endpointC')

      await Promise.all([clientReqB, clientReqC])
    })
  })
})
