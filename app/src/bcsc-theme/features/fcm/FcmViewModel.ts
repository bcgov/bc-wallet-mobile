import { AbstractBifoldLogger } from '@bifold/core'
import { getApp } from '@react-native-firebase/app'
import { getMessaging, getToken } from '@react-native-firebase/messaging'
import { decodeLoginChallenge, JWK, showLocalNotification } from 'react-native-bcsc-core'

import { Mode } from '../../../store'
import { getBCSCApiClient } from '../../contexts/BCSCApiClientContext'
import { isVerificationRequestReviewed } from '../../utils/id-token'
import { PairingService } from '../pairing'
import { VerificationResponseService } from '../verification-response'

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

  /**
   * @param fcmService - Firebase Cloud Messaging service
   * @param logger - Logger instance
   * @param pairingService - Service for handling pairing requests
   * @param verificationResponseService - Service for handling verification response notifications
   * @param mode - App mode (BCSC or BCWallet). Local notifications are only shown in BCSC mode.
   */
  constructor(
    private readonly fcmService: FcmService,
    private readonly logger: AbstractBifoldLogger,
    private readonly pairingService: PairingService,
    private readonly verificationResponseService: VerificationResponseService,
    private readonly mode: Mode = Mode.BCSC
  ) {}

  public initialize() {
    if (this.initialized) {
      this.logger.info('[FcmViewModel] Already initialized, skipping')
      return
    }
    this.initialized = true

    // Early return in BCWallet mode, we don't process FCM
    // messages the OS handles notifications
    if (this.mode !== Mode.BCSC) {
      this.logger.info('[FcmViewModel] Skipping FCM initialization in BCWallet mode - OS handles notifications')
      return
    }

    this.logger.info('[FcmViewModel] Initializing...')

    // Subscribe BEFORE init so we don't miss any messages
    this.fcmService.subscribe(this.handleMessage.bind(this))
    this.logger.info('[FcmViewModel] Subscribed to FCM service')
    this.fcmService.init()
    this.logger.info('[FcmViewModel] FCM service initialized')
    // Pre-fetch the server JWK for signature verification (if API client is ready)
    this.fetchServerJwk()
    // Log FCM token for debugging
    this.logFcmToken()
  }

  private async logFcmToken(): Promise<void> {
    try {
      const messagingInstance = getMessaging(getApp())
      const token = await getToken(messagingInstance)
      this.logger.debug(`[FcmViewModel] FCM Token: ${token}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`[FcmViewModel] Failed to retrieve FCM token for logging: ${message}`)
    }
  }

  private async handleMessage(message: FcmMessage) {
    this.logger.info(`[FcmViewModel] Received FCM message: type=${message.type}`)

    switch (message.type) {
      case 'challenge':
        await this.handleChallengeRequest(message.data)
        break
      case 'status':
        this.logger.info(`[FcmViewModel] Message: ${JSON.stringify(message)}`)
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

    // Check if this is a verification request reviewed notification (send-video)
    if (isVerificationRequestReviewed(data)) {
      this.logger.info('[FcmViewModel] Verification request reviewed, delegating to VerificationResponseService')
      this.verificationResponseService.handleRequestReviewed()
      return
    }
  }

  private async handleGenericNotification(data: BasicNotification) {
    const { title, body } = data

    this.logger.info(`[FcmViewModel] Showing local notification: title="${title}", body="${body}"`)
    try {
      await showLocalNotification(title, body)
      this.logger.info(`[FcmViewModel] Local notification shown successfully`)
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
