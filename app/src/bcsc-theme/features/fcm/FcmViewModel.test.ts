import { DeviceEventEmitter } from 'react-native'

import { BCSCEventTypes } from '../../../events/eventTypes'
import { Mode } from '../../../store'
import { PairingService } from '../pairing'
import { VerificationApprovalService } from '../verification-approval'
import { FcmViewModel } from './FcmViewModel'
import { FcmMessage, FcmService } from './services/fcm-service'

// Mock dependencies
jest.mock('react-native-bcsc-core', () => ({
  decodeLoginChallenge: jest.fn(),
  showLocalNotification: jest.fn(),
}))

// Mock the API client getter
const mockGetTokensForRefreshToken = jest.fn()
const mockFetchJwk = jest.fn()
const mockApiClient = {
  baseURL: 'https://test.example.com',
  fetchJwk: mockFetchJwk,
  getTokensForRefreshToken: mockGetTokensForRefreshToken,
  tokens: {
    refresh_token: 'mock-refresh-token',
  },
}

jest.mock('../../contexts/BCSCApiClientContext', () => ({
  getBCSCApiClient: jest.fn(() => mockApiClient),
}))

import { decodeLoginChallenge, showLocalNotification } from 'react-native-bcsc-core'
import { getBCSCApiClient } from '../../contexts/BCSCApiClientContext'
import { BCSCEvent, BCSCReason } from '../../utils/id-token'

describe('FcmViewModel', () => {
  let viewModel: FcmViewModel
  let mockFcmService: jest.Mocked<FcmService>
  let mockLogger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock }
  let mockPairingService: jest.Mocked<PairingService>
  let mockVerificationApprovalService: jest.Mocked<VerificationApprovalService>
  let capturedMessageHandler: ((message: FcmMessage) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    capturedMessageHandler = null

    // Reset mockApiClient to default state
    mockApiClient.baseURL = 'https://test.example.com'
    mockApiClient.tokens = { refresh_token: 'mock-refresh-token' }

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
      debug: jest.fn(),
    }

    mockPairingService = {
      handlePairing: jest.fn(),
    } as unknown as jest.Mocked<PairingService>

    mockVerificationApprovalService = {
      handleApproval: jest.fn(),
      handleRequestReviewed: jest.fn(),
    } as unknown as jest.Mocked<VerificationApprovalService>

    // Mock fetchJwk to return a test JWK
    mockFetchJwk.mockResolvedValue({ kty: 'RSA', n: 'test', e: 'AQAB' })

    viewModel = new FcmViewModel(
      mockFcmService,
      mockLogger as any,
      mockPairingService,
      mockVerificationApprovalService,
      Mode.BCSC
    )
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

      const message = {
        type: 'challenge',
        data: { jwt: 'test-jwt' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(decodeLoginChallenge).toHaveBeenCalledWith('test-jwt', { kty: 'RSA', n: 'test', e: 'AQAB' })
    })

    it('routes status messages to handleStatusNotification', async () => {
      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(showLocalNotification).toHaveBeenCalledWith('Status Update', 'Approved!')
    })

    it('routes notification messages to handleGenericNotification', async () => {
      const message = {
        type: 'notification',
        data: { title: 'Test Title', body: 'Test Body' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(showLocalNotification).toHaveBeenCalledWith('Test Title', 'Test Body')
    })

    it('logs warning for unknown message types', async () => {
      const message = {
        type: 'unknown',
      } as FcmMessage

      await capturedMessageHandler?.(message)

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

      const message = {
        type: 'challenge',
        data: { jwt: 'valid-jwt' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
        serviceTitle: 'My Service',
        pairingCode: 'code456',
        source: 'fcm',
      })
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

      const message = {
        type: 'challenge',
        data: { jwt: 'jwt-with-missing-claims' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('missing required fields'))
      expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
    })

    it('logs error when decodeLoginChallenge throws', async () => {
      const mockDecode = decodeLoginChallenge as jest.Mock
      mockDecode.mockRejectedValue(new Error('Invalid JWT'))

      const message = {
        type: 'challenge',
        data: { jwt: 'invalid-jwt' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to decode challenge'))
      expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
    })
  })

  describe('handleGenericNotification', () => {
    beforeEach(() => {
      viewModel.initialize()
    })

    it('shows notification when title and body are present', async () => {
      const message = {
        type: 'notification',
        data: { title: 'Hello', body: 'World' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(showLocalNotification).toHaveBeenCalledWith('Hello', 'World')
    })

    it('logs error when showLocalNotification throws', async () => {
      const mockShowNotification = showLocalNotification as jest.Mock
      mockShowNotification.mockRejectedValue(new Error('Notification failed'))

      const message = {
        type: 'notification',
        data: { title: 'Hello', body: 'World' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

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

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('API client not available'))
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

      const message = {
        type: 'challenge',
        data: { jwt: 'test-jwt' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockFetchJwk).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('environment changed'))
    })
  })

  describe('refreshTokens (via handleStatusNotification)', () => {
    let emitSpy: jest.SpyInstance

    beforeEach(() => {
      viewModel.initialize()
      emitSpy = jest.spyOn(DeviceEventEmitter, 'emit')
    })

    afterEach(() => {
      emitSpy.mockRestore()
    })

    it('refreshes tokens when a status notification is received', async () => {
      mockGetTokensForRefreshToken.mockResolvedValue({})

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('mock-refresh-token')
    })

    it('emits TOKENS_REFRESHED event after successful token refresh', async () => {
      mockGetTokensForRefreshToken.mockResolvedValue({})

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(emitSpy).toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })

    it('logs warning when no refresh token is available', async () => {
      mockApiClient.tokens = null as any

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot refresh tokens - no API client or refresh token available')
      )
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(emitSpy).not.toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })

    it('logs warning when API client is not available', async () => {
      const mockGetBCSCApiClient = getBCSCApiClient as jest.Mock
      mockGetBCSCApiClient.mockReturnValue(null)

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cannot refresh tokens - no API client or refresh token available')
      )
      expect(emitSpy).not.toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })

    it('logs error when token refresh fails', async () => {
      mockGetTokensForRefreshToken.mockRejectedValue(new Error('Token refresh failed'))

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: 'Status Update', message: 'Approved!' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to refresh tokens'))
      expect(emitSpy).not.toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })

    it('refreshes tokens even when status notification has no title/message', async () => {
      mockGetTokensForRefreshToken.mockResolvedValue({})

      const message = {
        type: 'status',
        data: { bcsc_status_notification: 'approved', title: '', message: '' },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      // showLocalNotification should NOT be called when title/message are empty
      expect(showLocalNotification).not.toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).toHaveBeenCalledWith('mock-refresh-token')
      expect(emitSpy).toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })
  })

  describe('verification approval detection', () => {
    let emitSpy: jest.SpyInstance

    beforeEach(() => {
      viewModel.initialize()
      emitSpy = jest.spyOn(DeviceEventEmitter, 'emit')
      mockGetTokensForRefreshToken.mockResolvedValue({})
    })

    afterEach(() => {
      emitSpy.mockRestore()
    })

    it('calls VerificationApprovalService when status notification indicates approval', async () => {
      const statusClaims = {
        bcsc_event: BCSCEvent.Authorization,
        bcsc_reason: BCSCReason.ApprovedByAgent,
        aud: 'test',
        iss: 'test',
        exp: 12345,
        iat: 12345,
        jti: 'test-jti',
      }

      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: JSON.stringify(statusClaims),
          title: 'Verification Approved',
          message: 'Your identity has been verified',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleApproval).toHaveBeenCalled()
    })

    it('does not call VerificationApprovalService for non-Authorization events', async () => {
      const statusClaims = {
        bcsc_event: BCSCEvent.Renewal,
        bcsc_reason: BCSCReason.Renew,
        aud: 'test',
        iss: 'test',
        exp: 12345,
        iat: 12345,
        jti: 'test-jti',
      }

      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: JSON.stringify(statusClaims),
          title: 'Renewal',
          message: 'Your account has been renewed',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleApproval).not.toHaveBeenCalled()
    })

    it('does not call VerificationApprovalService for Authorization with non-approval reason', async () => {
      const statusClaims = {
        bcsc_event: BCSCEvent.Authorization,
        bcsc_reason: BCSCReason.CanceledByAgent,
        aud: 'test',
        iss: 'test',
        exp: 12345,
        iat: 12345,
        jti: 'test-jti',
      }

      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: JSON.stringify(statusClaims),
          title: 'Status Update',
          message: 'Your account status has changed',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleApproval).not.toHaveBeenCalled()
    })

    it('handles missing bcsc_status_notification gracefully', async () => {
      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: '',
          title: 'Status Update',
          message: 'Some message',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      // With empty notification, parseStatusNotificationClaims returns null silently
      // and no verification approval is triggered
      expect(mockVerificationApprovalService.handleApproval).not.toHaveBeenCalled()
      expect(mockVerificationApprovalService.handleRequestReviewed).not.toHaveBeenCalled()
    })

    it('handles JSON parse failure gracefully', async () => {
      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: 'invalid-json{',
          title: 'Status Update',
          message: 'Some message',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      // With invalid JSON, parseStatusNotificationClaims returns null silently
      // and no verification approval is triggered
      expect(mockVerificationApprovalService.handleApproval).not.toHaveBeenCalled()
      expect(mockVerificationApprovalService.handleRequestReviewed).not.toHaveBeenCalled()
    })

    it('does not refresh tokens when verification approval is detected', async () => {
      const statusClaims = {
        bcsc_event: BCSCEvent.Authorization,
        bcsc_reason: BCSCReason.ApprovedByAgent,
        aud: 'test',
        iss: 'test',
        exp: 12345,
        iat: 12345,
        jti: 'test-jti',
      }

      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: JSON.stringify(statusClaims),
          title: 'Verification Approved',
          message: 'Your identity has been verified',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      // Verification approval should call service and skip token refresh
      expect(mockVerificationApprovalService.handleApproval).toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(emitSpy).not.toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })
  })

  describe('verification request reviewed detection (send-video)', () => {
    let emitSpy: jest.SpyInstance

    beforeEach(() => {
      viewModel.initialize()
      emitSpy = jest.spyOn(DeviceEventEmitter, 'emit')
      mockGetTokensForRefreshToken.mockResolvedValue({})
    })

    afterEach(() => {
      emitSpy.mockRestore()
    })

    it('calls handleRequestReviewed when title is "Verification Request Reviewed"', async () => {
      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: '',
          title: 'Verification Request Reviewed',
          message: 'Your verification request has been reviewed.',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleRequestReviewed).toHaveBeenCalled()
    })

    it('does not refresh tokens when verification request reviewed is detected', async () => {
      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: '',
          title: 'Verification Request Reviewed',
          message: 'Your verification request has been reviewed.',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleRequestReviewed).toHaveBeenCalled()
      expect(mockGetTokensForRefreshToken).not.toHaveBeenCalled()
      expect(emitSpy).not.toHaveBeenCalledWith(BCSCEventTypes.TOKENS_REFRESHED)
    })

    it('does not call handleRequestReviewed for other titles', async () => {
      const message = {
        type: 'status',
        data: {
          bcsc_status_notification: '',
          title: 'Some Other Title',
          message: 'Some message',
        },
      } as FcmMessage

      await capturedMessageHandler?.(message)

      expect(mockVerificationApprovalService.handleRequestReviewed).not.toHaveBeenCalled()
      // Should still refresh tokens for non-verification status notifications
      expect(mockGetTokensForRefreshToken).toHaveBeenCalled()
    })
  })

  // TODO: Remove these tests when BCWallet mode is deprecated and only BCSC remains
  describe('BCWallet mode - FCM service bypassed', () => {
    let bcWalletFcmService: jest.Mocked<FcmService>

    beforeEach(() => {
      bcWalletFcmService = {
        init: jest.fn(),
        destroy: jest.fn(),
        subscribe: jest.fn(),
      } as unknown as jest.Mocked<FcmService>
    })

    it('does not initialize FCM service in BCWallet mode', () => {
      const bcWalletViewModel = new FcmViewModel(
        bcWalletFcmService,
        mockLogger as any,
        mockPairingService,
        mockVerificationApprovalService,
        Mode.BCWallet
      )

      bcWalletViewModel.initialize()

      expect(bcWalletFcmService.subscribe).not.toHaveBeenCalled()
      expect(bcWalletFcmService.init).not.toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Skipping FCM initialization in BCWallet mode')
      )
    })

    it('does not fetch JWK in BCWallet mode', async () => {
      const bcWalletViewModel = new FcmViewModel(
        bcWalletFcmService,
        mockLogger as any,
        mockPairingService,
        mockVerificationApprovalService,
        Mode.BCWallet
      )

      bcWalletViewModel.initialize()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockFetchJwk).not.toHaveBeenCalled()
    })
  })
})
