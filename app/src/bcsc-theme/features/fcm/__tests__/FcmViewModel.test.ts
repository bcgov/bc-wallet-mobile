import { PairingService } from '../../pairing'
import { FcmViewModel } from '../FcmViewModel'
import { FcmMessagePayload, FcmService } from '../services/fcm-service'

// Mock dependencies
jest.mock('react-native-bcsc-core', () => ({
  decodeLoginChallenge: jest.fn(),
  showLocalNotification: jest.fn(),
}))

jest.mock('react-native-config', () => ({
  IAS_PORTAL_URL: 'https://test.example.com',
}))

// Mock fetch
global.fetch = jest.fn()

import { decodeLoginChallenge, showLocalNotification } from 'react-native-bcsc-core'

describe('FcmViewModel', () => {
  let viewModel: FcmViewModel
  let mockFcmService: jest.Mocked<FcmService>
  let mockLogger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock }
  let mockPairingService: jest.Mocked<PairingService>
  let capturedMessageHandler: ((payload: FcmMessagePayload) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    capturedMessageHandler = null

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

    // Mock fetch for JWK
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ keys: [{ kty: 'RSA', n: 'test', e: 'AQAB' }] }),
    })

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

    it('fetches server JWK on initialization', async () => {
      viewModel.initialize()

      // Wait for async fetch
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(global.fetch).toHaveBeenCalledWith('https://test.example.com/device/jwk')
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
      ;(decodeLoginChallenge as jest.Mock).mockResolvedValue(mockResult)

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
      const mockFetch = global.fetch as jest.Mock
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ keys: [] }),
      })

      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No keys found'))
    })

    it('logs error when fetch fails', async () => {
      const mockFetch = global.fetch as jest.Mock
      mockFetch.mockRejectedValue(new Error('Network error'))

      viewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch server JWK'))
    })
  })
})
