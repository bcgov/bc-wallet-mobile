import { AbstractBifoldLogger } from '@bifold/core'
import Config from 'react-native-config'

import { decodeLoginChallenge, JWK, showLocalNotification } from 'react-native-bcsc-core'

import { PairingService } from '../pairing'

import { FcmMessagePayload, FcmService } from './services/fcm-service'

/**
 * ViewModel for handling Firebase Cloud Messaging events.
 * Decodes JWT challenges and delegates pairing requests to PairingService.
 */
export class FcmViewModel {
  private serverJwk: JWK | null = null

  constructor(
    private readonly fcmService: FcmService,
    private readonly logger: AbstractBifoldLogger,
    private readonly pairingService: PairingService,
  ) {}

  public initialize() {
    this.logger.info('[FcmViewModel] Initializing...')
    // Subscribe BEFORE init so we don't miss any messages
    this.fcmService.subscribe(this.handleMessage.bind(this))
    this.logger.info('[FcmViewModel] Subscribed to FCM service')
    this.fcmService.init()
    this.logger.info('[FcmViewModel] FCM service initialized')
    // Pre-fetch the server JWK for signature verification
    this.fetchServerJwk()
  }

  private async handleMessage(payload: FcmMessagePayload) {
    this.logger.info(`[FcmViewModel] Received FCM message: type=${payload.type}`)

    switch (payload.type) {
      case 'challenge':
        // BCSC login challenge request, i.e. login from
        // a web service.
        await this.handleChallengeRequest(payload)
        break
      case 'status':
        // BCSC status notification, i.e. account approved.
        await this.handleStatusNotification(payload)
        break
      case 'notification':
        // Generic notification, i.e sent from Firebase console.
        this.logger.info(`[FcmViewModel] Handling generic notification`)
        await this.handleGenericNotification(payload)
        break
      default:
        this.logger.warn(`[FcmViewModel] Unknown message type: ${payload.type}`)
    }
  }

  private async handleChallengeRequest(payload: FcmMessagePayload) {
    if (!payload.challengeJwt) {
      this.logger.error('[FcmViewModel] Challenge payload missing JWT')
      return
    }

    const jwt = payload.challengeJwt
    this.logger.info(`[FcmViewModel] Processing challenge request`)

    try {
      // Decode and verify the JWT
      const result = await decodeLoginChallenge(jwt, this.serverJwk ?? undefined)

      this.logger.info(
        `[FcmViewModel] Challenge decoded: verified=${result.verified}, client=${result.claims.bcsc_client_name}`,
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

  private async handleStatusNotification(payload: FcmMessagePayload) {
    this.logger.info(`[FcmViewModel] Status notification received: ${JSON.stringify(payload.statusData)}`)

    await showLocalNotification('title', 'body')
  }

  private async handleGenericNotification(payload: FcmMessagePayload) {
    const { title, body } = payload

    if (title && body) {
      try {
        await showLocalNotification(title, body)
      } catch (error) {
        this.logger.error(`[FcmViewModel] Failed to show local notification: ${error}`)
      }
    }
  }

  private async fetchServerJwk(): Promise<void> {
    // TODO: Use API client if available
    try {
      const baseURL = Config.IAS_PORTAL_URL || 'https://idsit.gov.bc.ca'
      const response = await fetch(`${baseURL}/device/jwk`)
      const data = await response.json()

      if (data.keys && data.keys.length > 0) {
        this.serverJwk = data.keys[0]
        this.logger.info(`[FcmViewModel] Server JWK fetched successfully`)
      } else {
        this.logger.warn(`[FcmViewModel] No keys found in JWKS response`)
      }
    } catch (error) {
      this.logger.error(`[FcmViewModel] Failed to fetch server JWK: ${error}`)
    }
  }
}
