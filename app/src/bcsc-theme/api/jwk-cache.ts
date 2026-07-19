import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
import { RemoteLogger } from '@bifold/remote-logs'
import { JWK } from './hooks/useJwksApi'

/**
 * Last-known-good JWK persisted to disk so a briefly-unavailable JWKS endpoint (or a cold-start
 * fetch miss) doesn't block inner-JWS verification. Single record — only the most recently
 * fetched key/environment pair is kept.
 */
export interface PersistedJwkRecord {
  baseURL: string
  jwk: JWK
  fetchedAt: number // epoch ms, logging/diagnostics only — there is no TTL, this is network-first
}

/**
 * Persists the last-known-good JWK for `baseURL`.
 *
 * Never throws: a storage write failure is logged and swallowed (idempotency-over-erroring) since
 * this is best-effort caching, not a correctness requirement — `fetchJwk` already has the fresh key
 * in-memory for the current session regardless of whether persistence succeeds.
 *
 * @param baseURL - The IAS environment base URL the key belongs to
 * @param jwk - The JWK to persist
 * @param logger - Logger used to record a failure to persist
 */
export const persistJwk = async (baseURL: string, jwk: JWK, logger: RemoteLogger): Promise<void> => {
  const record: PersistedJwkRecord = { baseURL, jwk, fetchedAt: Date.now() }

  try {
    await PersistentStorage.storeValueForKey<PersistedJwkRecord>(BCLocalStorageKeys.CachedJWK, record, logger)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[jwk-cache] Failed to persist JWK for ${baseURL}: ${message}`)
  }
}

/**
 * Loads the last-known-good JWK for `baseURL`.
 *
 * Returns `null` when nothing has been persisted, the persisted record belongs to a different
 * environment (baseURL mismatch — e.g. a dev/test/prod switch, where a stale key must never be
 * used), or the read itself fails. Never throws.
 *
 * @param baseURL - The IAS environment base URL to match against the persisted record
 * @param logger - Logger used to record a failure to read
 */
export const loadPersistedJwk = async (baseURL: string, logger: RemoteLogger): Promise<JWK | null> => {
  try {
    const record = await PersistentStorage.fetchValueForKey<PersistedJwkRecord>(BCLocalStorageKeys.CachedJWK, logger)

    if (record?.baseURL !== baseURL) {
      return null
    }

    return record.jwk
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[jwk-cache] Failed to load persisted JWK for ${baseURL}: ${message}`)
    return null
  }
}
