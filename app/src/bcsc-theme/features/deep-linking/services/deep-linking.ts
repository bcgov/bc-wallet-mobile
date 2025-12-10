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
  private static readonly MIN_SEGMENTS = 3
  private readonly handlers = new Set<DeepLinkHandler>()
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

    // Replay any initial URL to new subscribers if it has not been consumed yet
    // so late subscribers do not miss deep links discovered during init().
    if (this.initialUrl) {
      handler(this.parseUrl(this.initialUrl))
      this.initialUrl = null
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
      const fallback = this.parseCustomScheme(rawUrl)
      if (fallback) {
        return fallback
      }

      // If URL parsing fails (invalid input or missing polyfill), surface raw data only.
      return { rawUrl }
    }
  }

  private parseCustomScheme(rawUrl: string): DeepLinkPayload | null {
    const separator = '://'
    const separatorIndex = rawUrl.indexOf(separator)

    if (separatorIndex === -1) {
      return null
    }

    const remainder = rawUrl.slice(separatorIndex + separator.length)
    if (!remainder) {
      return null
    }

    const [hostSegment, ...rest] = remainder.split('/')
    const path = rest.length ? `/${rest.join('/')}` : undefined
    const basePayload: DeepLinkPayload = {
      rawUrl,
      host: hostSegment || undefined,
      path,
    }

    if (hostSegment === 'pair' && path) {
      return {
        ...basePayload,
        ...this.extractPairingMetadataFromPath(path),
      }
    }

    return basePayload
  }

  private extractPairingMetadata(url: URL): Partial<DeepLinkPayload> {
    if (url.host !== 'pair') {
      return {}
    }

    return this.extractPairingMetadataFromPath(url.pathname, url.host)
  }

  private extractPairingMetadataFromPath(path: string | undefined, host?: string): Partial<DeepLinkPayload> {
    if (host && host !== 'pair') {
      return {}
    }

    if (!path) {
      return {}
    }

    const rawPath = path.startsWith('/') ? path.slice(1) : path

    try {
      const decodedPath = decodeURIComponent(rawPath)

      // Prefer URL parsing, but fall back to manual path splitting if pathname is unsupported
      let segments: string[] = []

      try {
        const nestedUrl = new URL(decodedPath)
        const pathname = nestedUrl.pathname
        segments = pathname.split('/').filter(Boolean)
      } catch {
        const manualPath = decodedPath.replace(/^https?:\/\//, '')
        segments = manualPath.split('/').filter(Boolean)
      }

      const deviceIndex = segments.indexOf('device')
      const expectedSegmentCount =
        deviceIndex === -1 ? DeepLinkService.MIN_SEGMENTS : deviceIndex + DeepLinkService.MIN_SEGMENTS

      if (deviceIndex !== -1 && segments.length >= expectedSegmentCount) {
        const serviceTitle = decodeURIComponent(segments[deviceIndex + 1].replaceAll('+', ' '))
        const pairingCode = segments[deviceIndex + 2]

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
