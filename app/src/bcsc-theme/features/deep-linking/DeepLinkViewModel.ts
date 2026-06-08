import { AbstractBifoldLogger, isDidCommInvitation } from '@bifold/core'
import { ConnectionInvitationService } from '../connection-invitation/ConnectionInvitationService'
import { PairingService } from '../pairing'
import { DeepLinkPayload, DeepLinkService } from './services/deep-linking'

/**
 * ViewModel for handling deep link URLs. Parses URLs and delegates pairing
 * requests to PairingService and out-of-band connection invitations to
 * ConnectionInvitationService.
 */
export class DeepLinkViewModel {
  constructor(
    private readonly deepLinkService: DeepLinkService,
    private readonly logger: AbstractBifoldLogger,
    private readonly pairingService: PairingService,
    private readonly connectionInvitationService: ConnectionInvitationService
  ) {}

  public initialize() {
    this.deepLinkService.subscribe(this.handleDeepLink.bind(this))
    this.deepLinkService.init()
  }

  private handleDeepLink(payload: DeepLinkPayload) {
    const { path } = payload
    this.logger.info(`[DeepLinkViewModel] Received: ${path ?? 'no-path'} ${JSON.stringify(payload)}`)

    // --- BUSINESS LOGIC ---

    if (this.handlePairing(payload)) {
      return
    }

    if (this.handleConnectionInvitation(payload)) {
      return
    }

    // Add more routes here as needed.
  }

  /**
   * Route an out-of-band connection invitation deep link (e.g.
   * `bcwallet://aries_connection_invitation?oob=<base64>`) to the
   * ConnectionInvitationService, which buffers it until the agent is ready.
   *
   * Detection keys off the invitation query param via Bifold's
   * `isDidCommInvitation`, which is scheme- and host-agnostic — robust even when
   * `parseUrl` mangles the host of `scheme://host?query` custom-scheme URLs.
   */
  private handleConnectionInvitation(payload: DeepLinkPayload): boolean {
    if (!isDidCommInvitation(payload.rawUrl)) {
      return false
    }

    this.connectionInvitationService.handleInvitation({
      url: payload.rawUrl,
      source: 'deep-link',
    })

    return true
  }

  private handlePairing(payload: DeepLinkPayload): boolean {
    if (payload.host !== 'pair') {
      return false
    }

    const parsedFromPath = payload.path ? this.parsePairingFromPath(payload.path) : {}
    const serviceTitle = payload.serviceTitle ?? parsedFromPath.serviceTitle
    const pairingCode = payload.pairingCode ?? parsedFromPath.pairingCode

    if (!serviceTitle || !pairingCode) {
      return false
    }

    // Delegate to PairingService
    this.pairingService.handlePairing({
      serviceTitle,
      pairingCode,
      source: 'deep-link',
    })

    return true
  }

  private parsePairingFromPath(path: string): { serviceTitle?: string; pairingCode?: string } {
    const rawPath = path.startsWith('/') ? path.slice(1) : path

    try {
      const decodedPath = decodeURIComponent(rawPath)
      const manualPath = decodedPath.replace(/^https?:\/\//, '')
      const segments = manualPath.split('/').filter(Boolean)
      const deviceIndex = segments.indexOf('device')
      const deviceRouteSegmentCount = 3
      const serviceTitleOffset = 1
      const pairingCodeOffset = 2

      if (deviceIndex === -1) {
        return {}
      }

      const requiredSegments = deviceIndex + deviceRouteSegmentCount

      if (segments.length >= requiredSegments) {
        const serviceTitle = decodeURIComponent(segments[deviceIndex + serviceTitleOffset].replaceAll('+', ' '))
        const pairingCode = segments[deviceIndex + pairingCodeOffset]

        return { serviceTitle, pairingCode }
      }
    } catch (e) {
      this.logger.warn(`[DeepLinkViewModel] Failed to parse pairing URL: ${e}`)
    }

    return {}
  }
}
