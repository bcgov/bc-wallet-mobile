import { AbstractBifoldLogger } from '@bifold/core'
import { DeviceEventEmitter } from 'react-native'
import { decodeLoginChallenge, JWK, showLocalNotification } from 'react-native-bcsc-core'

import { BCSCEventTypes } from '../../../events/eventTypes'
import { getBCSCApiClient } from '../../contexts/BCSCApiClientContext'
import { PairingService } from '../pairing'

import {
  BasicNotification,
  ChallengeNotification,
  FcmMessage,
  FcmService,
  StatusNotification,
} from './services/fcm-service'

/**
 * ViewModel for handling Firebase Cloud Messaging events.
 * Decodes JWT challenges and delegates pairing requests to PairingService.
 */
export class FcmViewModel {
  private serverJwk: JWK | null = null
  private lastJwkBaseUrl: string | null = null
  private initialized = false

  constructor(
    private readonly fcmService: FcmService,
    private readonly logger: AbstractBifoldLogger,
    private readonly pairingService: PairingService
  ) {}

  public initialize() {
    if (this.initialized) {
      this.logger.info('[FcmViewModel] Already initialized, skipping')
      return
    }
    this.initialized = true

    this.logger.info('[FcmViewModel] Initializing...')
    // Subscribe BEFORE init so we don't miss any messages
    this.fcmService.subscribe(this.handleMessage.bind(this))
    this.logger.info('[FcmViewModel] Subscribed to FCM service')
    this.fcmService.init()
    this.logger.info('[FcmViewModel] FCM service initialized')
    // Pre-fetch the server JWK for signature verification (if API client is ready)
    this.fetchServerJwk()
  }

  private async handleMessage(message: FcmMessage) {
    this.logger.info(`[FcmViewModel] Received FCM message: type=${message.type}`)

    switch (message.type) {
      case 'challenge':
        await this.handleChallengeRequest(message.data)
        break
      case 'status':
        await this.handleStatusNotification(message.data)
        break
      case 'notification':
        this.logger.info(`[FcmViewModel] Handling generic notification`)
        await this.handleGenericNotification(message.data)
        break
      default:
        this.logger.warn(`[FcmViewModel] Unknown message type`)
    }
  }

  private async handleChallengeRequest(data: ChallengeNotification) {
    const { jwt } = data
    this.logger.info(`[FcmViewModel] Processing challenge request`)

    try {
      // Check if environment changed or JWK not yet available
      const apiClient = getBCSCApiClient()
      const envChanged = apiClient && this.lastJwkBaseUrl && this.lastJwkBaseUrl !== apiClient.baseURL

      if (!this.serverJwk || envChanged) {
        this.logger.info('[FcmViewModel] JWK not available or environment changed, fetching now...')
        await this.fetchServerJwk()
      }

      // Decode and verify the JWT
      const result = await decodeLoginChallenge(jwt, this.serverJwk ?? undefined)

      this.logger.info(
        `[FcmViewModel] Challenge decoded: verified=${result.verified}, client=${result.claims.bcsc_client_name}`
      )

      // Extract pairing data and inject into deep link flow
      const serviceTitle = result.claims.bcsc_client_name
      const pairingCode = result.claims.bcsc_challenge

      if (!serviceTitle || !pairingCode) {
        this.logger.error('[FcmViewModel] Challenge missing required fields (bcsc_client_name or bcsc_challenge)')
        return
      }

      this.logger.info(`[FcmViewModel] Injecting challenge into pairing flow: ${serviceTitle}`)
      this.pairingService.handlePairing({
        serviceTitle,
        pairingCode,
        source: 'fcm',
      })
    } catch (error) {
      this.logger.error(`[FcmViewModel] Failed to decode challenge: ${error}`)
    }
  }

  private async handleStatusNotification(data: StatusNotification) {
    this.logger.info(`[FcmViewModel] Status notification received: ${JSON.stringify(data)}`)

    const { title, message } = data

    // Show local notification if we have title and message
    if (title && message) {
      try {
        await showLocalNotification(title, message)
      } catch (error) {
        this.logger.error(`[FcmViewModel] Failed to show status notification: ${error}`)
      }
    } else {
      this.logger.warn('[FcmViewModel] Status notification missing title or message - skipping local notification')
    }

    // Always refresh tokens when we receive a status notification
    // This ensures account data is updated regardless of notification display
    await this.refreshTokens()
  }

  /**
   * Refreshes OAuth tokens using the current refresh token.
   * Emits a TOKENS_REFRESHED event so React components can update their state.
   */
  private async refreshTokens(): Promise<void> {
    try {
      const apiClient = getBCSCApiClient()

      if (!apiClient?.tokens?.refresh_token) {
        this.logger.warn('[FcmViewModel] Cannot refresh tokens - no API client or refresh token available')
        return
      }

      await apiClient.getTokensForRefreshToken(apiClient.tokens.refresh_token)
      this.logger.info('[FcmViewModel] Tokens refreshed successfully after status notification')

      // Emit event so React components (e.g., BCSCAccountProvider) can refresh their data
      DeviceEventEmitter.emit(BCSCEventTypes.TOKENS_REFRESHED)
    } catch (error) {
      this.logger.error(`[FcmViewModel] Failed to refresh tokens: ${error}`)
    }
  }

  private async handleGenericNotification(data: BasicNotification) {
    const { title, body } = data

    try {
      await showLocalNotification(title, body)
    } catch (error) {
      this.logger.error(`[FcmViewModel] Failed to show local notification: ${error}`)
    }
  }

  private async fetchServerJwk(): Promise<void> {
    try {
      const apiClient = getBCSCApiClient()

      if (!apiClient) {
        this.logger.info('[FcmViewModel] API client not available yet, will retry on next challenge')
        return
      }

      // Check if environment changed (baseURL changed) - invalidate cached JWK
      if (this.lastJwkBaseUrl && this.lastJwkBaseUrl !== apiClient.baseURL) {
        this.logger.info('[FcmViewModel] Environment changed, clearing cached JWK')
        this.serverJwk = null
      }

      const jwk = await apiClient.fetchJwk()

      if (jwk) {
        this.serverJwk = jwk
        this.lastJwkBaseUrl = apiClient.baseURL
        this.logger.info(`[FcmViewModel] Server JWK fetched successfully from ${apiClient.baseURL}`)
      } else {
        this.logger.warn(`[FcmViewModel] No keys found in JWKS response`)
      }
    } catch (error) {
      this.logger.error(`[FcmViewModel] Failed to fetch server JWK: ${error}`)
    }
  }
}
