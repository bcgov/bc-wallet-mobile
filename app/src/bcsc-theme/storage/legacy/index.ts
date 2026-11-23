import { type AsyncStorageLike, createLegacyAsyncReader, type LegacyAsyncKey, type LegacyRead } from './async-storage'
import { type LegacyNativeReader, type LegacySnapshot, readLegacySnapshot } from './native'

export type LegacyDetection = 'present' | 'none' | 'locked' | 'unreadable'

// Read-only view of everything written before the new store existed
export interface LegacySources {
  async(key: LegacyAsyncKey): Promise<LegacyRead>
  native(): Promise<LegacySnapshot>
  detect(): Promise<LegacyDetection>
  // Only m0003 and wipe() delete: AsyncStorage keys by name, and every bcsc-core record
  removeAsync(keys: readonly LegacyAsyncKey[]): Promise<void>
  removeNative(): Promise<void>
}

export const createLegacySources = (
  asyncStorage: AsyncStorageLike,
  native: LegacyNativeReader,
  removeNative: () => Promise<void>
): LegacySources => {
  const async = createLegacyAsyncReader(asyncStorage)
  return {
    async,
    native: () => readLegacySnapshot(native),
    // Counts the bcsc-core account record and the AsyncStorage BCSC key. Keychain items alone don't count,
    // because iOS keeps them across a reinstall.
    detect: async () => {
      const [account, blob] = await Promise.all([native.readLegacyRecord('account'), asyncStorage.getItem('BCSC')])
      if (account.status === 'locked' || account.status === 'unreadable') {
        return account.status
      }
      return account.status === 'ok' || blob !== null ? 'present' : 'none'
    },
    removeAsync: async (keys) => {
      await Promise.all(keys.map((key) => asyncStorage.removeItem(key)))
    },
    removeNative,
  }
}

export type { LegacyAsyncKey, LegacyRead } from './async-storage'
export type { LegacyNativeReader, LegacyRecord, LegacySnapshot, LegacyValues } from './native'
