import { loadPersistedJwk, persistJwk } from '@/bcsc-theme/api/jwk-cache'
import { storage } from '@/bcsc-theme/storage'
import { JWK } from '@/bcsc-theme/types/jwk'
import { RemoteLogger } from '@bifold/remote-logs'

const baseURL = 'https://example.com'
const otherBaseURL = 'https://other.example.com'
const jwk: JWK = { kty: 'RSA', e: 'AQAB', kid: 'test-kid', alg: 'RS256', n: 'test-modulus' }

// Matches the plain-object logger mock convention used elsewhere for RemoteLogger-typed params
// (e.g. client.test.ts) — RemoteLogger has private fields, so a MockLogger instance (which extends
// the sibling BifoldLogger base) is not structurally assignable to it.
const createMockLogger = (): RemoteLogger =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) as unknown as RemoteLogger

describe('jwk-cache', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('persistJwk / loadPersistedJwk round trip', () => {
    it('loads the persisted JWK for the same baseURL it was persisted under', async () => {
      const logger = createMockLogger()

      await persistJwk(baseURL, jwk, logger)

      expect(loadPersistedJwk(baseURL, logger)).toEqual(jwk)
    })

    it('returns null when the persisted record belongs to a different baseURL (environment switch)', async () => {
      const logger = createMockLogger()

      await persistJwk(baseURL, jwk, logger)

      expect(loadPersistedJwk(otherBaseURL, logger)).toBeNull()
    })

    it('returns null when nothing has been persisted', () => {
      expect(loadPersistedJwk(baseURL, createMockLogger())).toBeNull()
    })

    it('returns null when the cached value is not a JWK record', async () => {
      await storage.store.getState().caches.setCache('jwk', { baseURL })

      expect(loadPersistedJwk(baseURL, createMockLogger())).toBeNull()
    })

    it('persists to the jwk cache', async () => {
      await persistJwk(baseURL, jwk, createMockLogger())

      expect(storage.store.getState().caches.jwk).toEqual(expect.objectContaining({ baseURL, jwk }))
    })
  })

  describe('storage failures are swallowed', () => {
    it('persistJwk resolves even when the cache write rejects', async () => {
      const logger = createMockLogger()
      const caches = storage.store.getState().caches
      jest.spyOn(caches, 'setCache').mockRejectedValueOnce(new Error('disk full'))

      await expect(persistJwk(baseURL, jwk, logger)).resolves.toBeUndefined()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
