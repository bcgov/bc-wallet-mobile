import { BifoldLogger } from '@bifold/core'

/**
 * A simple in-memory cache for media files to avoid redundant disk reads.
 *
 * @class MediaCache
 */
export class MediaCache {
  cachedMedia: Buffer | null = null
  private cachedMediaPromise: Promise<Buffer> | null = null

  /**
   * Retrieves the cached media buffer if available.
   *
   * @memberof MediaCache
   * @param {BifoldLogger} logger - The logger instance for logging messages.
   * @returns {*} {Promise<Buffer | null>} - The cached media buffer or null if not cached.
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

  /**
   * Caches the provided media buffer in memory.
   *
   * @memberof MediaCache
   * @param {Buffer | Promise<Buffer> | null} buffer - The media buffer to cache.
   * @returns {*} {void}
   */
  setCache(buffer: Buffer | Promise<Buffer> | null): void {
    if (buffer instanceof Promise) {
      this.cachedMedia = null
      this.cachedMediaPromise = buffer
      return
    }

    this.cachedMedia = buffer
    this.cachedMediaPromise = null
  }

  /**
   * Clears the cache.
   *
   * @memberof MediaCache
   * @returns {*} {void}
   */
  clearCache(): void {
    this.setCache(null)
  }

  /**
   * Retrieves the cached media buffer if available.
   *
   * @memberof MediaCache
   * @param {BifoldLogger} logger - The logger instance for logging messages.
   * @returns {*} {Promise<Buffer | null>} - The media buffer.
   */
  async getCache(logger: BifoldLogger): Promise<Buffer | null> {
    const cachedMedia = await this._getCache(logger)

    if (cachedMedia) {
      logger.debug('MediaCache: Returning media from cache')
    }

    return cachedMedia
  }
}
