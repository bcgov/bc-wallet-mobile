import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

// Unversioned: a cache that doesn't parse is thrown away and refills
const cacheKey = (key: string) =>
  persistedKey({ key, schema: z.unknown().nullable(), backend: 'plain', initial: null, onUnreadable: 'initial' })

export const CACHES_KEYS = {
  jwk: cacheKey('caches/jwk'),
  genesis: cacheKey('caches/genesis'),
  remoteConfig: cacheKey('caches/remoteConfig'),
}
export type CacheName = keyof typeof CACHES_KEYS

export interface CachesSlice {
  caches: { [N in CacheName]: unknown } & {
    setCache(name: CacheName, value: unknown): Promise<void>
    clearCache(name: CacheName): Promise<void>
  }
}

export const createCachesSlice =
  ({ persist }: SliceContext): BCSCSlice<CachesSlice> =>
  () => ({
    caches: {
      jwk: null,
      genesis: null,
      remoteConfig: null,
      setCache: (name, value) => persist.write(CACHES_KEYS[name], value),
      clearCache: (name) => persist.remove(CACHES_KEYS[name]),
    },
  })
