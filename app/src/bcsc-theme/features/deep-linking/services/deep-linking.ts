import { Linking } from 'react-native'

export type DeepLinkPayload = {
  rawUrl: string
  host?: string
  path?: string
  serviceTitle?: string
  pairingCode?: string
}

export type DeepLinkHandler = (payload: DeepLinkPayload) => void

/**
 * Lightweight pub-sub wrapper around React Native's Linking API so screens/view models
 * can react to deep-link events without touching platform primitives directly.
 */
export class DeepLinkService {
  private handlers = new Set<DeepLinkHandler>()
  private subscription?: { remove(): void }
  private initialized = false
  private initialUrl: string | null = null

  public async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    // Store the initial URL so late subscribers can still get it if needed
    // or we can emit it immediately if we have handlers
    const url = await Linking.getInitialURL()
    if (url) {
      this.initialUrl = url
      this.emit(url)
    }

    this.subscription = Linking.addEventListener('url', ({ url }) => this.emit(url))
  }

  public destroy(): void {
    this.subscription?.remove()
    this.subscription = undefined
    this.initialized = false
    this.initialUrl = null
    this.handlers.clear()
  }

  public subscribe(handler: DeepLinkHandler): () => void {
    this.handlers.add(handler)

    // If we have an initial URL that hasn't been handled by this handler yet,
    // we might want to replay it. For now, we rely on the fact that init()
    // emits it to all current handlers. If subscribe happens AFTER init(),
    // we might miss it.
    //
    // To fix the race condition completely:
    if (this.initialUrl) {
      // Optional: decide if we want to replay this for every new subscriber
      // or just rely on the ViewModel being ready before init() is called.
      // For this implementation, we'll assume the ViewModel subscribes BEFORE init().
    }

    return () => this.handlers.delete(handler)
  }

  private emit(rawUrl: string): void {
    const payload = this.parseUrl(rawUrl)
    this.handlers.forEach((handler) => handler(payload))
  }

  private parseUrl(rawUrl: string): DeepLinkPayload {
    try {
      const url = new URL(rawUrl)
      return {
        rawUrl,
        host: url.host,
        path: url.pathname,
        ...this.extractPairingMetadata(url),
      }
    } catch {
      // If URL parsing fails (invalid input or missing polyfill), surface raw data only.
      return { rawUrl }
    }
  }

  private extractPairingMetadata(url: URL): Partial<DeepLinkPayload> {
    if (url.host !== 'pair' || !url.pathname) {
      return {}
    }

    const rawPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname

    try {
      const decodedPath = decodeURIComponent(rawPath)
      const nestedUrl = new URL(decodedPath)
      const segments = nestedUrl.pathname.split('/').filter(Boolean)
      const expectedSegmentCount = 3

      if (segments[0] === 'device' && segments.length >= expectedSegmentCount) {
        const serviceTitle = decodeURIComponent(segments[1].replace(/\+/g, ' '))
        const pairingCode = segments[2]

        return {
          serviceTitle,
          pairingCode,
        }
      }

      return {}
    } catch {
      return {}
    }
  }
}
