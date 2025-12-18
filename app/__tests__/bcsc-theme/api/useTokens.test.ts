import { VerifyAttestationPayload } from '@/bcsc-theme/api/hooks/useDeviceAttestationApi'
import { getIdTokenMetadata } from '@/bcsc-theme/utils/id-token'
import { renderHook } from '@testing-library/react-native'
import { BasicAppContext } from '__mocks__/helpers/app'
import { getDeviceCodeRequestBody } from 'react-native-bcsc-core'
import BCSCApiClient from '../../../src/bcsc-theme/api/client'
import useTokenApi, { TokenResponse } from '../../../src/bcsc-theme/api/hooks/useTokens'
import { withAccount } from '../../../src/bcsc-theme/api/hooks/withAccountGuard'

// Prettier automatically adds a ; at the start of some lines, which causes eslint no-extra-semi to complain
/* eslint-disable no-extra-semi */

// Mock dependencies
jest.mock('react-native-bcsc-core', () => ({
  getDeviceCodeRequestBody: jest.fn(),
  TokenType: {
    Access: 0,
    Refresh: 1,
    Registration: 2,
  },
  getToken: jest.fn().mockResolvedValue(null),
  setToken: jest.fn().mockResolvedValue(true),
  deleteToken: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../../src/bcsc-theme/api/hooks/withAccountGuard', () => ({
  withAccount: jest.fn(),
}))

jest.mock('../../../src/bcsc-theme/utils/id-token', () => ({
  getIdTokenMetadata: jest.fn(),
}))

describe('useTokenApi', () => {
  let mockApiClient: jest.Mocked<BCSCApiClient>
  let mockTokenResponse: TokenResponse
  let mockAxiosResponse: any

  beforeEach(() => {
    mockTokenResponse = {
      access_token: 'mock_access_token',
      expires_in: 3600,
      id_token: 'mock_id_token',
      refresh_token: 'mock_refresh_token',
      scope: 'openid profile',
      token_type: 'Bearer',
    }

    mockAxiosResponse = {
      data: mockTokenResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }

    mockApiClient = {
      post: jest.fn(),
      endpoints: {
        token: '/oauth/token',
        attestation: '/attestation',
      },
      tokens: mockTokenResponse,
      getTokensForRefreshToken: jest.fn(),
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      },
    } as any
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe('deviceToken', () => {
    it('should request device token as expected', async () => {
      const mockPayload: VerifyAttestationPayload = {
        device_code: 'mock_device_code',
        client_id: 'mock_client_id',
        client_assertion: 'mock_client_assertion',
        attestation: 'mock_attestation',
      }

      mockApiClient.post.mockResolvedValue(mockAxiosResponse)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })
      const response = await result.current.deviceToken(mockPayload)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/oauth/token',
        {
          device_code: 'mock_device_code',
          client_id: 'mock_client_id',
          client_assertion: 'mock_client_assertion',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        },
      )

      expect(response).toEqual(mockTokenResponse)
    })
  })

  describe('checkDeviceCodeStatus', () => {
    it('should successfully check device code status', async () => {
      const mockAccount = {
        clientID: 'mock_client_id',
        issuer: 'mock_issuer',
      }

      const mockRequestBody = 'grant_type=device_code&device_code=test&client_id=test'

      ;(getDeviceCodeRequestBody as jest.Mock).mockResolvedValue(mockRequestBody)
      ;(withAccount as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockAccount)
      })

      mockApiClient.post.mockResolvedValue(mockAxiosResponse)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })
      const response = await result.current.checkDeviceCodeStatus('test_device_code', 'test_confirmation')

      expect(getDeviceCodeRequestBody).toHaveBeenCalledWith(
        'test_device_code',
        'mock_client_id',
        'mock_issuer',
        'test_confirmation',
      )

      expect(mockApiClient.post).toHaveBeenCalledWith('/oauth/token', mockRequestBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      expect(mockApiClient.tokens).toEqual(mockTokenResponse)
      expect(response).toEqual(mockTokenResponse)
    })

    it('should handle withAccount errors', async () => {
      const mockError = new Error('Account not found')
      ;(withAccount as jest.Mock).mockRejectedValue(mockError)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })

      await expect(result.current.checkDeviceCodeStatus('test_device_code', 'test_confirmation')).rejects.toThrow(
        'Account not found',
      )
    })
  })

  describe('getCachedIdTokenMetadata', () => {
    it('should return cached ID token metadata without refresh', async () => {
      const mockMetadata = { sub: 'user123', exp: 1234567890 }
      ;(getIdTokenMetadata as jest.Mock).mockReturnValue(mockMetadata)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })
      const metadata = await result.current.getCachedIdTokenMetadata({ refreshCache: false })

      expect(getIdTokenMetadata).toHaveBeenCalledWith('mock_id_token', mockApiClient.logger)
      expect(mockApiClient.getTokensForRefreshToken).not.toHaveBeenCalled()
      expect(metadata).toEqual(mockMetadata)
    })

    it('should refresh tokens before returning metadata when refreshCache is true', async () => {
      const mockMetadata = { sub: 'user123', exp: 1234567890 }
      ;(getIdTokenMetadata as jest.Mock).mockReturnValue(mockMetadata)

      mockApiClient.getTokensForRefreshToken.mockResolvedValue(mockTokenResponse)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })
      const metadata = await result.current.getCachedIdTokenMetadata({ refreshCache: true })

      expect(mockApiClient.getTokensForRefreshToken).toHaveBeenCalledWith('mock_refresh_token')
      expect(getIdTokenMetadata).toHaveBeenCalledWith('mock_id_token', mockApiClient.logger)
      expect(metadata).toEqual(mockMetadata)
    })

    it('should throw error when no tokens are available', async () => {
      mockApiClient.tokens = null as any

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })

      await expect(result.current.getCachedIdTokenMetadata({ refreshCache: false })).rejects.toThrow(
        'No tokens available',
      )
    })

    it('should handle refresh token errors', async () => {
      const mockError = new Error('Refresh token expired')
      mockApiClient.getTokensForRefreshToken.mockRejectedValue(mockError)

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })

      await expect(result.current.getCachedIdTokenMetadata({ refreshCache: true })).rejects.toThrow(
        'Refresh token expired',
      )
    })

    it('should use updated tokens after refresh when refreshCache is true', async () => {
      const mockMetadata = { sub: 'user123', exp: 1234567890 }
      const updatedTokens = {
        ...mockTokenResponse,
        id_token: 'new_updated_id_token',
      }

      ;(getIdTokenMetadata as jest.Mock).mockReturnValue(mockMetadata)
      mockApiClient.getTokensForRefreshToken.mockImplementation(() => {
        // Simulate updating the tokens on the client
        mockApiClient.tokens = updatedTokens
        return Promise.resolve(updatedTokens)
      })

      const { result } = renderHook(() => useTokenApi(mockApiClient), { wrapper: BasicAppContext })
      await result.current.getCachedIdTokenMetadata({ refreshCache: true })

      expect(getIdTokenMetadata).toHaveBeenCalledWith('new_updated_id_token', mockApiClient.logger)
    })
  })
})
