import { MediaCache } from '@/bcsc-theme/utils/media-cache'
import { MockLogger } from '@bifold/core'

describe('MediaCache', () => {
  describe('setCachedMedia', () => {
    it('should set the cache', async () => {
      const mediaCache = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.setCachedMedia(mockMediaBuffer)

      expect(mediaCache.cachedMedia).toBe(mockMediaBuffer)
    })
  })

  describe('removeMediaAndClearCache', () => {
    it('should remove media and clear cache', async () => {
      const mediaCache: any = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.setCachedMedia(mockMediaBuffer)

      mediaCache.removeFileSafely = jest.fn().mockResolvedValue(undefined)

      expect(mediaCache.cachedMedia).toBe(mockMediaBuffer)
    })
  })

  describe('getCachedMedia', () => {
    it('should get cached media', async () => {
      const mockLogger = new MockLogger()
      const mediaCache: any = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.cachedMedia = mockMediaBuffer

      const cachedMedia = await mediaCache.getCachedMedia('mock/path', mockLogger)

      expect(cachedMedia).toBe(mockMediaBuffer)
    })

    it('should read media from disk if not cached', async () => {
      const mockLogger = new MockLogger()
      const mediaCache: any = new MediaCache()
      const mockMediaBuffer = Buffer.from('mock media data')

      mediaCache.readFileInChunks = jest.fn().mockResolvedValue(mockMediaBuffer)

      const media = await mediaCache.getCachedMedia('mock/path', mockLogger)

      expect(media).toBe(mockMediaBuffer)
      expect(mediaCache.readFileInChunks).toHaveBeenCalledWith('mock/path', mockLogger)
    })
  })
})
