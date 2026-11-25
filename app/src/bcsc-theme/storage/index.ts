import { appLogger } from '@/utils/logger'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearAllKeychainData,
  deleteAccountFlags,
  deleteAuthorizationRequest,
  deleteCredential,
  deleteEvidence,
  deleteSavedServices,
  deleteToken,
  readLegacyRecord,
  removeAccount,
  TokenType,
} from 'react-native-bcsc-core'
import * as Keychain from 'react-native-keychain'
import { createMMKV, deleteMMKV, existsMMKV } from 'react-native-mmkv'
import { useStore } from 'zustand'
import { createStorage } from './create-storage'
import { createEncryptedBackend } from './engine/encrypted-backend'
import { keychainKeyStore } from './engine/key-store'
import { keychainBackend } from './engine/keychain-backend'
import { createMeta } from './engine/meta'
import { mmkvBackend } from './engine/mmkv-backend'
import { createLegacySources } from './legacy'
import { BCSC_OWNED_ASYNC_KEYS } from './legacy/async-storage'
import { createNativeRecordReader } from './legacy/native'
import type { BCSCStore } from './slices'

const plainInstance = createMMKV({ id: 'bcsc.plain', recoveryStrategy: 'recover-on-error' })
const meta = createMeta(plainInstance)
const nativeReader = createNativeRecordReader(readLegacyRecord)

// Today's deletes, tokens before the account: on iOS the tokens are found through the account file. Each is tried,
// because bcsc-core rejects them when there is no native account (every install since s2), and a reject must not
// stop the rest; whoever calls this checks what is left (m0003's verify). The evidence record goes with the account
// folder: deleteEvidence would also delete the photo folder, and the photos belong to the store's evidence now.
const removeLegacyRecords = async (): Promise<void> => {
  await Promise.allSettled([
    deleteToken(TokenType.Refresh),
    // eslint-disable-next-line no-restricted-syntax -- the native copy, once m0002 has moved it to account/registration
    deleteToken(TokenType.Registration),
    deleteToken(TokenType.Access),
    deleteAuthorizationRequest(),
    deleteAccountFlags(),
    deleteSavedServices(),
    deleteCredential(),
  ])
  await removeAccount().catch(() => undefined)
}

// wipe(): everything, the photos included
const removeLegacyNativeData = async (): Promise<void> => {
  await deleteEvidence().catch(() => undefined)
  await removeLegacyRecords()
}

export const storage = createStorage({
  plain: { ...mmkvBackend(() => plainInstance), clearAll: () => plainInstance.clearAll() },
  encrypted: createEncryptedBackend(
    keychainKeyStore(Keychain),
    { create: createMMKV, exists: existsMMKV, remove: deleteMMKV },
    meta
  ),
  keychain: keychainBackend(Keychain, Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY),
  meta,
  legacy: createLegacySources(AsyncStorage, nativeReader, removeLegacyRecords),
  ownedAsyncKeys: BCSC_OWNED_ASYNC_KEYS,
  core: { clearAllKeychainData, removeLegacyNativeData },
  logger: appLogger,
})

// The selector is required: without one, every change re-renders the component, as Bifold's context does today
export const useBCSCStore = <S>(selector: (state: BCSCStore) => S): S => useStore(storage.store, selector)

export type { OpenResult } from './engine/open'
export type { BCSCStore } from './slices'
