import { AbstractBifoldLogger } from '@bifold/core'
import { BCSCScreens } from '../../types/navigators'
import { DeepLinkPayload, DeepLinkService } from './services/deep-linking'

type DeepLinkNavigationEvent = {
  screen: string
  params?: Record<string, any>
}

type NavigationListener = (event: DeepLinkNavigationEvent) => void
type PendingStateListener = (hasPending: boolean) => void

export class DeepLinkViewModel {
  private readonly navigationListeners = new Set<NavigationListener>()
  private readonly pendingStateListeners = new Set<PendingStateListener>()
  private pendingDeepLink: DeepLinkPayload | null = null

  constructor(
    private readonly deepLinkService: DeepLinkService,
    private readonly logger: AbstractBifoldLogger,
  ) {}

  public initialize() {
    this.deepLinkService.subscribe(this.handleDeepLink.bind(this))
    this.deepLinkService.init()
  }

  public onNavigationRequest(listener: NavigationListener): () => void {
    this.navigationListeners.add(listener)
    return () => this.navigationListeners.delete(listener)
  }

  public onPendingStateChange(listener: PendingStateListener): () => void {
    this.pendingStateListeners.add(listener)
    // Emit current state immediately upon subscription
    listener(this.hasPendingDeepLink)
    return () => this.pendingStateListeners.delete(listener)
  }

  public get hasPendingDeepLink(): boolean {
    return this.pendingDeepLink !== null
  }

  public getPendingDeepLink(): DeepLinkPayload | null {
    return this.pendingDeepLink
  }

  public consumePendingDeepLink(): DeepLinkPayload | null {
    if (!this.pendingDeepLink) {
      return null
    }

    const payload = this.pendingDeepLink
    this.pendingDeepLink = null
    this.notifyPendingStateChange()
    return payload
  }

  public processPendingDeepLink() {
    if (this.pendingDeepLink) {
      this.logger.info(`[DeepLinkViewModel] Processing pending deep link: ${this.pendingDeepLink.path}`)
      const payload = this.pendingDeepLink
      this.pendingDeepLink = null
      this.notifyPendingStateChange()
      this.handleDeepLink(payload)
    }
  }

  public clearPendingDeepLink() {
    this.pendingDeepLink = null
    this.notifyPendingStateChange()
  }

  private handleDeepLink(payload: DeepLinkPayload) {
    const { path } = payload
    this.logger.info(`[DeepLinkViewModel] Received: ${path ?? 'no-path'} ${JSON.stringify(payload)}`)

    // --- BUSINESS LOGIC ---

    if (this.handlePairing(payload)) {
      return
    }

    // Add more routes here as needed.
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

    this.logger.info(`[DeepLinkViewModel] Pairing: ${serviceTitle} ${pairingCode}`)

    if (this.navigationListeners.size > 0) {
      this.logger.info(`[DeepLinkViewModel] Emitting navigation to ${BCSCScreens.ServiceLogin}`)
      this.emitNavigation({
        screen: BCSCScreens.ServiceLogin,
        params: { serviceTitle, pairingCode },
      })
    } else {
      this.logger.info(`[DeepLinkViewModel] Buffering pairing link`)
      this.pendingDeepLink = payload
      this.notifyPendingStateChange()
    }

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

  private emitNavigation(event: DeepLinkNavigationEvent) {
    this.navigationListeners.forEach((listener) => listener(event))
  }

  private notifyPendingStateChange() {
    const hasPending = this.hasPendingDeepLink
    this.pendingStateListeners.forEach((listener) => listener(hasPending))
  }
}
