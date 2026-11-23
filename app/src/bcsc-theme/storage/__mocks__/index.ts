// Jest stand-in for the storage module (applied in jestSetup.js): the real store over in-memory backends,
// already open, so components and hooks can read it and call its actions. Seed and reset it with ./testing.
import { clearAllKeychainData } from 'react-native-bcsc-core'
import { useStore } from 'zustand'
import { createStorage } from '../create-storage'
import type { Backend } from '../engine/backend'
import type { EncryptedBackend } from '../engine/encrypted-backend'
import { createMemoryKeyValueStore } from '../engine/memory-backend'
import { createMeta } from '../engine/meta'
import { mmkvBackend } from '../engine/mmkv-backend'
import type { BCSCStore } from '../slices'

const memoryBackend = (): Backend & { clearAll(): void } => {
  const store = createMemoryKeyValueStore()
  return { ...mmkvBackend(() => store), clearAll: () => store.clearAll() }
}

const plainStore = createMemoryKeyValueStore()
const encrypted: EncryptedBackend & { clearAll(): void } = {
  ...memoryBackend(),
  open: async () => 'opened',
  destroy: async () => undefined,
  isOpen: () => true,
  keepKeyThrough: (clear) => clear(),
}

const keychain = memoryBackend()

const created = createStorage({
  plain: { ...mmkvBackend(() => plainStore), clearAll: () => plainStore.clearAll() },
  encrypted,
  keychain,
  meta: createMeta(plainStore),
  legacy: {
    async: async () => ({ status: 'absent' }),
    native: async () => ({}) as never,
    detect: async () => 'none',
    removeAsync: async () => undefined,
    removeNative: async () => undefined,
  },
  ownedAsyncKeys: [],
  // Through to bcsc-core's mock, as the real module is wired, so tests can see and fail the call
  core: { clearAllKeychainData: () => clearAllKeychainData(), removeLegacyNativeData: async () => undefined },
  logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
})

// A reset also empties the backends, so nothing a test wrote is read back by the next one
export const storage = {
  ...created,
  reset: () => {
    for (const backend of [plainStore, encrypted, keychain]) {
      backend.clearAll()
    }
    created.reset()
  },
}

export const useBCSCStore = <S>(selector: (state: BCSCStore) => S): S => useStore(storage.store, selector)

export type { OpenResult } from '../engine/open'
export type { BCSCStore } from '../slices'
