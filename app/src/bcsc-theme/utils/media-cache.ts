import { BifoldLogger } from '@bifold/core'

/**
 * A simple in-memory cache for media files to avoid redundant disk reads.
 */
export class MediaCache {
  cachedMedia: Buffer | null = null
  private cachedMediaPromise: Promise<Buffer> | null = null

  /**
   * Retrieves the cached media buffer if available.
   *
   * @param logger - The logger instance for logging messages.
   * @returns - The cached media buffer or null if not cached.
   */
  private async _getCache(logger: BifoldLogger): Promise<Buffer | null> {
    const pendingPromise = this.cachedMediaPromise

    if (!pendingPromise) {
      return this.cachedMedia
    }

    logger.debug('MediaCache: Awaiting cached media promise')
    const media = await pendingPromise

    // clearCache() or setCache() ran while waiting, so this result is stale
    if (this.cachedMediaPromise !== pendingPromise) {
      return this.cachedMedia
    }

    this.cachedMedia = media
    this.cachedMediaPromise = null
    return media
  }

  setCache(buffer: Buffer | Promise<Buffer> | null): void {
    if (buffer instanceof Promise) {
      this.cachedMedia = null
      this.cachedMediaPromise = buffer
      return
    }

    this.cachedMedia = buffer
    this.cachedMediaPromise = null
  }

  clearCache(): void {
    this.setCache(null)
  }

  async getCache(logger: BifoldLogger): Promise<Buffer | null> {
    const cachedMedia = await this._getCache(logger)

    if (cachedMedia) {
      logger.debug('MediaCache: Returning media from cache')
    }

    return cachedMedia
  }
}
