import type { KeyValueStore } from './backend'

const VERSION = 'meta/version'
const WIPE_IN_PROGRESS = 'meta/wipe-in-progress'
const ENCRYPTED_READY = 'meta/encrypted-ready'
const failuresKey = (version: number) => `meta/failures/${version}`

// Engine bookkeeping in plain MMKV. clearAll() removes it with everything else, which is what wipe() relies on.
export interface Meta {
  version(): number | undefined
  setVersion(version: number): void
  wipeInProgress(): boolean
  setWipeInProgress(): void
  encryptedReady(): boolean
  setEncryptedReady(): void
  recordFailure(version: number): number // returns the attempt count
  clearFailures(version: number): void
}

const readNumber = (store: KeyValueStore, key: string): number | undefined => {
  const raw = store.getString(key)
  if (raw === undefined) {
    return undefined
  }
  const value = Number(raw)
  return Number.isInteger(value) ? value : undefined
}

export const META_KEY_PREFIX = 'meta/'

export const createMeta = (store: KeyValueStore): Meta => ({
  version: () => readNumber(store, VERSION),
  setVersion: (version) => store.set(VERSION, String(version)),
  wipeInProgress: () => store.contains(WIPE_IN_PROGRESS),
  setWipeInProgress: () => store.set(WIPE_IN_PROGRESS, '1'),
  encryptedReady: () => store.contains(ENCRYPTED_READY),
  setEncryptedReady: () => store.set(ENCRYPTED_READY, '1'),
  recordFailure: (version) => {
    const attempts = (readNumber(store, failuresKey(version)) ?? 0) + 1
    store.set(failuresKey(version), String(attempts))
    return attempts
  },
  clearFailures: (version) => {
    store.remove(failuresKey(version))
  },
})
