import type { StorageDeps } from '../create-storage'
import { PERSISTED_KEYS } from '../slices'

// Safe to repeat. The flag is in plain MMKV and is cleared last, so open() finishes an interrupted wipe.
export const createWipe = (deps: StorageDeps, reset: () => void) => {
  return async () => {
    deps.meta.setWipeInProgress()
    // bcsc-core records first: on iOS the tokens are found through the account file
    await deps.core.removeLegacyNativeData()
    await deps.core.clearAllKeychainData() // device keys and bcsc-core keychain items
    // The AsyncStorage keys BCSC owned, or the next open() would import them again
    await deps.legacy.removeAsync(deps.ownedAsyncKeys)
    const keychainKeys = PERSISTED_KEYS.filter((def) => def.backend === 'keychain')
    await Promise.all(keychainKeys.map((def) => deps.keychain.remove(def.key)))
    await deps.encrypted.destroy() // the instance and its key
    deps.plain.clearAll() // includes meta, so the version and the wipe flag go last
    reset() // the store back to its initial state, session included
  }
}
