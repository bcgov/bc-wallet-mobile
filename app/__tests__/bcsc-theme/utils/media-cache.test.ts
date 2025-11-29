import { MediaCache } from '@/bcsc-theme/utils/media-cache'
import { MockLogger } from '@bifold/core'

describe('MediaCache', () => {
  describe('setCache', () => {
    it('should set the cache', async () => {
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.setCache(mockMediaBuffer)

      expect(mediaCache.cachedMedia).toBe(mockMediaBuffer)
    })

    it('should set the cache with a promise', async () => {
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')
      const mockMediaPromise = Promise.resolve(mockMediaBuffer)

      mediaCache.setCache(mockMediaPromise)

      expect(mediaCache.cachedMedia).toBeNull()
    })

    it('should set the cache to null', async () => {
      const mediaCache = new MediaCache()

      mediaCache.setCache(null)

      expect(mediaCache.cachedMedia).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should remove media and clear cache', async () => {
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.setCache(mockMediaBuffer)

      expect(mediaCache.cachedMedia).toBe(mockMediaBuffer)

      mediaCache.clearCache()

      expect(mediaCache.cachedMedia).toBeNull()
    })
  })

  describe('getCache', () => {
    it('should get cached media', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.cachedMedia = mockMediaBuffer

      const cachedMedia = await mediaCache.getCache(mockLogger)

      expect(cachedMedia).toBe(mockMediaBuffer)
    })

    it('should await cached media promise and return media', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')
      const mockMediaPromise = Promise.resolve(mockMediaBuffer)

      mediaCache.setCache(mockMediaPromise)

      const cachedMedia = await mediaCache.getCache(mockLogger)

      expect(cachedMedia).toBe(mockMediaBuffer)
      expect(mediaCache.cachedMedia).toBe(mockMediaBuffer)
    })
  })
})
