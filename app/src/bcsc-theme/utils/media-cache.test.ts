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

    it('should return null after clearCache drops a pending promise', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()

      mediaCache.setCache(Promise.resolve(Buffer.from('old video')))
      mediaCache.clearCache()

      expect(await mediaCache.getCache(mockLogger)).toBeNull()
    })

    it('should not rethrow a rejected promise after clearCache', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const rejected = Promise.reject(new Error('read failed'))
      rejected.catch(() => undefined)

      mediaCache.setCache(rejected)
      mediaCache.clearCache()

      await expect(mediaCache.getCache(mockLogger)).resolves.toBeNull()
    })

    it('should return the buffer when setCache replaces a pending promise', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const newBuffer = Buffer.from('new video')

      mediaCache.setCache(Promise.resolve(Buffer.from('old video')))
      mediaCache.setCache(newBuffer)

      expect(await mediaCache.getCache(mockLogger)).toBe(newBuffer)
    })

    it('should not return stale media when clearCache is called while awaiting', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      let resolveRead!: (buffer: Buffer) => void
      const pendingRead = new Promise<Buffer>((resolve) => {
        resolveRead = resolve
      })

      mediaCache.setCache(pendingRead)
      const result = mediaCache.getCache(mockLogger)

      mediaCache.clearCache()
      resolveRead(Buffer.from('old video'))

      expect(await result).toBeNull()
      expect(mediaCache.cachedMedia).toBeNull()
    })

    it('should not store stale media when setCache is called with a buffer while awaiting', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const newBuffer = Buffer.from('new video')
      let resolveRead!: (buffer: Buffer) => void
      const pendingRead = new Promise<Buffer>((resolve) => {
        resolveRead = resolve
      })

      mediaCache.setCache(pendingRead)
      const result = mediaCache.getCache(mockLogger)

      mediaCache.setCache(newBuffer)
      resolveRead(Buffer.from('old video'))

      expect(await result).toBe(newBuffer)
      expect(mediaCache.cachedMedia).toBe(newBuffer)
    })

    it('should not store stale media when setCache is called with a new promise while awaiting', async () => {
      const mockLogger = new MockLogger()
      const mediaCache = new MediaCache()
      const newBuffer = Buffer.from('new video')
      let resolveRead!: (buffer: Buffer) => void
      const pendingRead = new Promise<Buffer>((resolve) => {
        resolveRead = resolve
      })

      mediaCache.setCache(pendingRead)
      const staleResult = mediaCache.getCache(mockLogger)

      mediaCache.setCache(Promise.resolve(newBuffer))
      resolveRead(Buffer.from('old video'))

      expect(await staleResult).toBeNull()
      expect(await mediaCache.getCache(mockLogger)).toBe(newBuffer)
    })
  })
})
