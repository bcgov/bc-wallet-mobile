import { JWK } from '@/bcsc-theme/api/hooks/useJwksApi'
import { loadPersistedJwk, persistJwk } from '@/bcsc-theme/api/jwk-cache'
import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
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
      const result = await loadPersistedJwk(baseURL, logger)

      expect(result).toEqual(jwk)
    })

    it('returns null when the persisted record belongs to a different baseURL (environment switch)', async () => {
      const logger = createMockLogger()

      await persistJwk(baseURL, jwk, logger)
      const result = await loadPersistedJwk(otherBaseURL, logger)

      expect(result).toBeNull()
    })

    it('returns null when nothing has been persisted', async () => {
      const logger = createMockLogger()
      jest.spyOn(PersistentStorage, 'fetchValueForKey').mockResolvedValueOnce(undefined)

      const result = await loadPersistedJwk(baseURL, logger)

      expect(result).toBeNull()
    })

    it('persists under the canonical CachedJWK storage key', async () => {
      const logger = createMockLogger()
      const storeSpy = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue()

      await persistJwk(baseURL, jwk, logger)

      expect(storeSpy).toHaveBeenCalledWith(
        BCLocalStorageKeys.CachedJWK,
        expect.objectContaining({ baseURL, jwk }),
        logger
      )
    })
  })

  describe('storage failures are swallowed', () => {
    it('persistJwk resolves even when storeValueForKey rejects', async () => {
      const logger = createMockLogger()
      jest.spyOn(PersistentStorage, 'storeValueForKey').mockRejectedValueOnce(new Error('disk full'))

      await expect(persistJwk(baseURL, jwk, logger)).resolves.toBeUndefined()
    })

    it('loadPersistedJwk returns null when fetchValueForKey rejects', async () => {
      const logger = createMockLogger()
      jest.spyOn(PersistentStorage, 'fetchValueForKey').mockRejectedValueOnce(new Error('read error'))

      const result = await loadPersistedJwk(baseURL, logger)

      expect(result).toBeNull()
    })
  })
})
