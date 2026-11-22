import { createStore } from 'zustand/vanilla'
import type { Backend } from './engine/backend'
import type { EncryptedBackend } from './engine/encrypted-backend'
import type { StorageLogger } from './engine/logger'
import type { Meta } from './engine/meta'
import { createOpen } from './engine/open'
import { createPersistence } from './engine/persistence'
import { createWipe } from './engine/wipe'
import type { LegacySources } from './legacy'
import type { LegacyAsyncKey } from './legacy/async-storage'
import { MIGRATIONS } from './migrations'
import type { Migration } from './migrations/types'
import { type BCSCStore, createSlices } from './slices'

export interface StorageDeps {
  plain: Backend & { clearAll(): void }
  encrypted: EncryptedBackend
  keychain: Backend
  meta: Meta
  legacy: LegacySources
  // The AsyncStorage keys wipe() removes
  ownedAsyncKeys: readonly LegacyAsyncKey[]
  core: {
    clearAllKeychainData(): Promise<void>
    removeLegacyNativeData(): Promise<void>
  }
  logger: StorageLogger
  migrations?: readonly Migration[] // tests only
}

export const createStorage = (deps: StorageDeps) => {
  const persistence = createPersistence({
    backends: { plain: deps.plain, encrypted: deps.encrypted, keychain: deps.keychain },
    logger: deps.logger,
    store: () => store,
  })
  const store = createStore<BCSCStore>()(createSlices({ persist: persistence.slices }))
  const initialState = store.getState()

  // Every key back to absent, and every slice back to its initial state, session included
  const reset = () => {
    persistence.reset()
    store.setState(initialState, true)
  }

  // bcsc-core's clearAllKeychainData deletes every keychain item the app has: its device keys, and the store's
  // encryption key and tokens. The key is put back, so the encrypted store still opens; the tokens stay deleted.
  const clearKeychain = () => deps.encrypted.keepKeyThrough(deps.core.clearAllKeychainData)

  const wipe = createWipe(deps, reset)
  const open = createOpen({ ...deps, migrations: deps.migrations ?? MIGRATIONS }, persistence, wipe)
  return { store, wipe, open, clearKeychain, status: persistence.status, reset }
}

export type Storage = ReturnType<typeof createStorage>
