import readFileInChunks from '@/utils/read-file'
import { BifoldLogger } from '@bifold/core'
import { removeFileSafely } from './file-info'

/**
 * A simple in-memory cache for media files to avoid redundant disk reads.
 *
 */
export class MediaCache {
  cachedMedia: Buffer | null = null
  private cachedMediaPromise: Promise<Buffer> | null = null
  private removeFileSafely = removeFileSafely
  private readFileInChunks = readFileInChunks

  private async getCache(logger: BifoldLogger): Promise<Buffer | null> {
    if (this.cachedMediaPromise) {
      logger.debug('MediaCache: Awaiting cached media promise')

      this.cachedMedia = await this.cachedMediaPromise
      this.cachedMediaPromise = null
    }

    return this.cachedMedia
  }

  /**
   * Caches the provided media buffer in memory.
   *
   * @param {Buffer | null} buffer - The media buffer to cache.
   * @returns {*} {void}
   */
  setCachedMedia(buffer: Buffer | Promise<Buffer> | null): void {
    if (buffer === null) {
      this.cachedMedia = null
      this.cachedMediaPromise = null
      return
    }

    if (buffer instanceof Promise) {
      this.cachedMediaPromise = buffer
      return
    }

    this.cachedMedia = buffer
  }

  /**
   * Removes the media file at the specified path and clears the in-memory cache.
   *
   * @param {string | undefined} path - The file path to remove.
   * @param {BifoldLogger} logger - The logger instance for logging messages.
   * @returns {*} {Promise<void>}
   */
  async removeMediaAndClearCache(path: string | undefined, logger: BifoldLogger): Promise<void> {
    await this.removeFileSafely(path, logger)
    this.setCachedMedia(null)
  }

  /**
   * Retrieves the cached media buffer if available; otherwise, reads it from disk.
   *
   * @param {string} path - The file path to read the media from if not cached.
   * @param {BifoldLogger} logger - The logger instance for logging messages.
   * @returns {*} {Promise<Buffer>} - The media buffer.
   */
  async getCachedMedia(path: string, logger: BifoldLogger): Promise<Buffer> {
    const cachedMedia = await this.getCache(logger)

    if (cachedMedia) {
      logger.debug('MediaCache: Returning media from cache')
      return cachedMedia
    }

    logger.debug('MediaCache: Reading media from disk')
    const mediaBuffer = await this.readFileInChunks(path, logger)

    return mediaBuffer
  }
}
