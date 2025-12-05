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
  private navigationListeners = new Set<NavigationListener>()
  private pendingStateListeners = new Set<PendingStateListener>()
  private pendingDeepLink: DeepLinkPayload | null = null

  constructor(private deepLinkService: DeepLinkService, private logger: AbstractBifoldLogger) {}

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
    const { host, path } = payload
    this.logger.info(`[DeepLinkViewModel] Received: ${path} ${JSON.stringify(payload)}`)

    // --- BUSINESS LOGIC ---

    // Handle Pairing: ca.bc.gov.iddev.servicescard://pair/<encoded-url>
    if (host === 'pair' && path) {
      try {
        // 1. Remove leading slash if present (e.g. /https%3A...)
        const rawPath = path.startsWith('/') ? path.slice(1) : path

        // 2. Decode the full URL (e.g. https://idsit.gov.bc.ca/device/BC+Parks+Discover+Camping/MDLAHC)
        const decodedUrl = decodeURIComponent(rawPath)

        // 3. Parse the decoded URL to extract segments
        // We can use the URL class again since it's a valid http(s) URL now
        const urlObj = new URL(decodedUrl)
        const segments = urlObj.pathname.split('/').filter(Boolean)

        // Expected format: /device/<serviceTitle>/<pairingCode>
        // segments[0] = 'device'
        // segments[1] = 'BC+Parks+Discover+Camping' (Service Title)
        // segments[2] = 'MDLAHC' (Pairing Code)

        if (segments[0] === 'device' && segments.length >= 3) {
          const serviceTitle = decodeURIComponent(segments[1].replace(/\+/g, ' '))
          const pairingCode = segments[2]

          this.logger.info(`[DeepLinkViewModel] Pairing: ${serviceTitle} ${pairingCode}`)

          // If we have listeners (app is ready), emit immediately
          if (this.navigationListeners.size > 0) {
            this.logger.info(`[DeepLinkViewModel] Emitting navigation to ${BCSCScreens.ServiceLogin}`)
            this.emitNavigation({
              screen: BCSCScreens.ServiceLogin,
              params: { serviceTitle, pairingCode },
            })
          } else {
            // Otherwise buffer it
            this.logger.info(`[DeepLinkViewModel] Buffering pairing link`)
            this.pendingDeepLink = payload
            this.notifyPendingStateChange()
          }

          return
        }
      } catch (e) {
        this.logger.warn(`[DeepLinkViewModel] Failed to parse pairing URL: ${e}`)
      }
    }

    // Add more routes here
  }

  private emitNavigation(event: DeepLinkNavigationEvent) {
    this.navigationListeners.forEach((listener) => listener(event))
  }

  private notifyPendingStateChange() {
    const hasPending = this.hasPendingDeepLink
    this.pendingStateListeners.forEach((listener) => listener(hasPending))
  }
}
