// Hermes has no crypto.getRandomValues; this module needs it before anything else (Credo) loads the polyfill
import { Buffer } from 'buffer'
import 'react-native-get-random-values'
import * as Keychain from 'react-native-keychain'
import type { ReadResult } from './backend'
import { keychainBackend, type KeychainApi } from './keychain-backend'

export interface KeyStore {
  read(): Promise<ReadResult>
  create(): Promise<string> // stored readable after first unlock, so routing works before login
  restore(key: string): Promise<void>
  remove(): Promise<void>
}

const KEY_NAME = 'meta/encryption-key'

// AES-256 in MMKV takes up to 32 bytes: base64 of 24 random bytes is exactly 32 ASCII characters
export const createEncryptionKey = (randomBytes: (length: number) => Uint8Array): string =>
  Buffer.from(randomBytes(24)).toString('base64')

export const keychainKeyStore = (
  keychain: KeychainApi,
  randomBytes: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length))
): KeyStore => {
  const backend = keychainBackend(keychain, Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY)
  return {
    read: () => backend.read(KEY_NAME),
    create: async () => {
      const key = createEncryptionKey(randomBytes)
      await backend.write(KEY_NAME, key)
      return key
    },
    restore: (key) => backend.write(KEY_NAME, key),
    remove: () => backend.remove(KEY_NAME),
  }
}
