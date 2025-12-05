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

  constructor(private readonly deepLinkService: DeepLinkService, private readonly logger: AbstractBifoldLogger) {}

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
    const { host, path, serviceTitle: parsedServiceTitle, pairingCode: parsedPairingCode } = payload
    this.logger.info(`[DeepLinkViewModel] Received: ${path ?? 'no-path'} ${JSON.stringify(payload)}`)

    // --- BUSINESS LOGIC ---

    // Handle Pairing: ca.bc.gov.iddev.servicescard://pair/<encoded-url>
    if (host === 'pair') {
      let serviceTitle = parsedServiceTitle
      let pairingCode = parsedPairingCode

      if ((!serviceTitle || !pairingCode) && path) {
        try {
          const rawPath = path.startsWith('/') ? path.slice(1) : path
          const decodedUrl = decodeURIComponent(rawPath)
          const urlObj = new URL(decodedUrl)
          const segments = urlObj.pathname.split('/').filter(Boolean)

          if (segments[0] === 'device' && segments.length >= 3) {
            serviceTitle = decodeURIComponent(segments[1].replaceAll('+', ' '))
            pairingCode = segments[2]
          }
        } catch (e) {
          this.logger.warn(`[DeepLinkViewModel] Failed to parse pairing URL: ${e}`)
        }
      }

      if (serviceTitle && pairingCode) {
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

        return
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
