import { PairingService } from '../../pairing'
import { FcmViewModel } from '../FcmViewModel'
import { FcmMessagePayload, FcmService } from '../services/fcm-service'

// Mock dependencies
jest.mock('react-native-bcsc-core', () => ({
  decodeLoginChallenge: jest.fn(),
  showLocalNotification: jest.fn(),
}))

// Mock the API client getter
const mockFetchJwk = jest.fn()
const mockApiClient = {
  baseURL: 'https://test.example.com',
  fetchJwk: mockFetchJwk,
}

jest.mock('../../../contexts/BCSCApiClientContext', () => ({
  getBCSCApiClient: jest.fn(() => mockApiClient),
}))

import { decodeLoginChallenge, showLocalNotification } from 'react-native-bcsc-core'
import { getBCSCApiClient } from '../../../contexts/BCSCApiClientContext'

describe('FcmViewModel', () => {
  let viewModel: FcmViewModel
  let mockFcmService: jest.Mocked<FcmService>
  let mockLogger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock }
  let mockPairingService: jest.Mocked<PairingService>
  let capturedMessageHandler: ((payload: FcmMessagePayload) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    capturedMessageHandler = null

    // Reset mockApiClient to default state
    mockApiClient.baseURL = 'https://test.example.com'

    // Reset getBCSCApiClient to return mockApiClient (in case a test changed it)
    const mockGetBCSCApiClient = getBCSCApiClient as jest.Mock
    mockGetBCSCApiClient.mockReturnValue(mockApiClient)

    mockFcmService = {
      init: jest.fn(),
      destroy: jest.fn(),
      subscribe: jest.fn((handler) => {
        capturedMessageHandler = handler
        return jest.fn()
      }),
    } as unknown as jest.Mocked<FcmService>

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    mockPairingService = {
      handlePairing: jest.fn(),
    } as unknown as jest.Mocked<PairingService>

    // Mock fetchJwk to return a test JWK
    mockFetchJwk.mockResolvedValue({ kty: 'RSA', n: 'test', e: 'AQAB' })

    viewModel = new FcmViewModel(mockFcmService, mockLogger as any, mockPairingService)
  })

  describe('initialize', () => {
    it('subscribes to FCM service and calls init', () => {
      viewModel.initialize()

      expect(mockFcmService.subscribe).toHaveBeenCalledTimes(1)
      expect(mockFcmService.init).toHaveBeenCalledTimes(1)
    })

    it('subscribes before calling init to avoid missing messages', () => {
      const callOrder: string[] = []
      mockFcmService.subscribe.mockImplementation((handler) => {
        callOrder.push('subscribe')
        capturedMessageHandler = handler
        return jest.fn()
      })
      mockFcmService.init.mockImplementation(() => {
        callOrder.push('init')
        return Promise.resolve()
      })

      viewModel.initialize()

      expect(callOrder).toEqual(['subscribe', 'init'])
    })

    it('fetches server JWK on initialization when API client is available', async () => {
      viewModel.initialize()

      // Wait for async fetch
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockFetchJwk).toHaveBeenCalled()
    })
  })

  describe('handleMessage routing', () => {
    beforeEach(async () => {
      viewModel.initialize()
      // Wait for async JWK fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    it('routes challenge messages to handleChallengeRequest', async () => {
      const mockResult = {
        verified: true,
        claims: {
          bcsc_client_name: 'Test Service',
          bcsc_challenge: 'challenge123',
        },
      }
      const mockDecode = decodeLoginChallenge as jest.Mock
      mockDecode.mockResolvedValue(mockResult)

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: 'test-jwt',
      }

      await capturedMessageHandler?.(payload)

      expect(decodeLoginChallenge).toHaveBeenCalledWith('test-jwt', { kty: 'RSA', n: 'test', e: 'AQAB' })
    })

    it('routes status messages to handleStatusNotification', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'status',
        statusData: { status: 'approved' },
      }

      await capturedMessageHandler?.(payload)

      expect(showLocalNotification).toHaveBeenCalled()
    })

    it('routes notification messages to handleGenericNotification', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'notification',
        title: 'Test Title',
        body: 'Test Body',
      }

      await capturedMessageHandler?.(payload)

      expect(showLocalNotification).toHaveBeenCalledWith('Test Title', 'Test Body')
    })

    it('logs warning for unknown message types', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'unknown',
      }

      await capturedMessageHandler?.(payload)

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown message type'))
    })
  })

  describe('handleChallengeRequest', () => {
    beforeEach(() => {
      viewModel.initialize()
    })

    it('decodes JWT and calls pairing service with correct payload', async () => {
      const mockResult = {
        verified: true,
        claims: {
          bcsc_client_name: 'My Service',
          bcsc_challenge: 'code456',
        },
      }
      ;(decodeLoginChallenge as jest.Mock).mockResolvedValue(mockResult)

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: 'valid-jwt',
      }

      await capturedMessageHandler?.(payload)

      expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
        serviceTitle: 'My Service',
        pairingCode: 'code456',
        source: 'fcm',
      })
    })

    it('logs error when challengeJwt is missing', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: undefined,
      }

      await capturedMessageHandler?.(payload)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Challenge payload missing JWT'))
      expect(decodeLoginChallenge).not.toHaveBeenCalled()
    })

    it('logs error when required claims are missing', async () => {
      const mockResult = {
        verified: true,
        claims: {
          bcsc_client_name: '',
          bcsc_challenge: '',
        },
      }
      ;(decodeLoginChallenge as jest.Mock).mockResolvedValue(mockResult)

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: 'jwt-with-missing-claims',
      }

      await capturedMessageHandler?.(payload)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('missing required fields'))
      expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
    })

    it('logs error when decodeLoginChallenge throws', async () => {
      const mockDecode = decodeLoginChallenge as jest.Mock
      mockDecode.mockRejectedValue(new Error('Invalid JWT'))

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: 'invalid-jwt',
      }

      await capturedMessageHandler?.(payload)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to decode challenge'))
      expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
    })
  })

  describe('handleGenericNotification', () => {
    beforeEach(() => {
      viewModel.initialize()
    })

    it('shows notification when title and body are present', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'notification',
        title: 'Hello',
        body: 'World',
      }

      await capturedMessageHandler?.(payload)

      expect(showLocalNotification).toHaveBeenCalledWith('Hello', 'World')
    })

    it('does not show notification when title is missing', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'notification',
        title: undefined,
        body: 'World',
      }

      await capturedMessageHandler?.(payload)

      expect(showLocalNotification).not.toHaveBeenCalled()
    })

    it('does not show notification when body is missing', async () => {
      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'notification',
        title: 'Hello',
        body: undefined,
      }

      await capturedMessageHandler?.(payload)

      expect(showLocalNotification).not.toHaveBeenCalled()
    })

    it('logs error when showLocalNotification throws', async () => {
      const mockShowNotification = showLocalNotification as jest.Mock
      mockShowNotification.mockRejectedValue(new Error('Notification failed'))

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'notification',
        title: 'Hello',
        body: 'World',
      }

      await capturedMessageHandler?.(payload)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to show local notification'))
    })
  })

  describe('fetchServerJwk', () => {
    it('logs warning when no keys in response', async () => {
      mockFetchJwk.mockResolvedValue(null)

      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No keys found'))
    })

    it('logs error when fetch fails', async () => {
      mockFetchJwk.mockRejectedValue(new Error('Network error'))

      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch server JWK'))
    })

    it('logs warning when API client is not available', async () => {
      const mockGetBCSCApiClient = getBCSCApiClient as jest.Mock
      mockGetBCSCApiClient.mockReturnValue(null)

      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('API client not available'))
    })

    it('refetches JWK when environment changes', async () => {
      // First initialization with original baseURL
      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockFetchJwk).toHaveBeenCalledTimes(1)

      // Simulate environment change
      mockApiClient.baseURL = 'https://new-environment.com'
      mockFetchJwk.mockClear()

      // Process a challenge - should detect environment change and refetch
      const mockResult = {
        verified: true,
        claims: {
          bcsc_client_name: 'Test Service',
          bcsc_challenge: 'challenge123',
        },
      }
      const mockDecode = decodeLoginChallenge as jest.Mock
      mockDecode.mockResolvedValue(mockResult)

      const payload: FcmMessagePayload = {
        rawMessage: {} as any,
        type: 'challenge',
        challengeJwt: 'test-jwt',
      }

      await capturedMessageHandler?.(payload)

      expect(mockFetchJwk).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('environment changed'))
    })
  })
})
