import type { Backend, KeyValueStore } from './backend'
import type { KeyStore } from './key-store'
import type { Meta } from './meta'
import { mmkvBackend } from './mmkv-backend'

export const SECURE_ID = 'bcsc.secure'
const CANARY_KEY = 'meta/canary'
const CANARY = 'bcsc'

export interface MmkvConfig {
  id: string
  encryptionKey: string
  encryptionType: 'AES-256'
  recoveryStrategy: 'recover-on-error'
}

export interface MmkvFactory {
  create(config: MmkvConfig): KeyValueStore
  exists(id: string): boolean
  remove(id: string): void
}

export type EncryptedOpenResult = 'opened' | 'locked' | 'key-missing' | 'wrong-key' | 'unreadable'

export interface EncryptedBackend extends Backend {
  open(): Promise<EncryptedOpenResult>
  destroy(): Promise<void>
  isOpen(): boolean
}

export const createEncryptedBackend = (keys: KeyStore, mmkv: MmkvFactory, meta: Meta): EncryptedBackend => {
  let instance: KeyValueStore | undefined
  const backend = mmkvBackend(() => {
    if (!instance) {
      throw new Error('encrypted backend is not open')
    }
    return instance
  })

  const openWith = (encryptionKey: string) => {
    instance = mmkv.create({
      id: SECURE_ID,
      encryptionKey,
      encryptionType: 'AES-256',
      recoveryStrategy: 'recover-on-error',
    })
  }

  // Nothing is written to the instance until it is ready, so an unfinished one is safe to recreate
  const finishCreating = () => {
    instance?.set(CANARY_KEY, CANARY)
    meta.setEncryptedReady()
  }

  return {
    ...backend,
    // Before open() there is no instance, so the key-placement check finds nothing rather than throwing
    contains: (key) => instance?.contains(key) ?? false,
    isOpen: () => instance !== undefined,
    open: async () => {
      const key = await keys.read()
      if (key.status === 'locked' || key.status === 'unreadable') {
        return key.status
      }
      let encryptionKey: string
      if (key.status === 'absent') {
        // A finished store without its key is data loss, never a fresh start
        if (meta.encryptedReady()) {
          return 'key-missing'
        }
        if (mmkv.exists(SECURE_ID)) {
          mmkv.remove(SECURE_ID)
        }
        encryptionKey = await keys.create()
      } else {
        encryptionKey = key.value
      }
      // Only opening the file is caught: MMKV throws when it can't open it with this key
      try {
        openWith(encryptionKey)
      } catch {
        instance = undefined
        return 'unreadable'
      }
      if (!meta.encryptedReady()) {
        finishCreating()
        return 'opened'
      }
      // MMKV may read a wrong key as "empty" rather than failing
      if (instance?.getString(CANARY_KEY) !== CANARY) {
        instance = undefined
        return 'wrong-key'
      }
      return 'opened'
    },
    destroy: async () => {
      instance = undefined
      if (mmkv.exists(SECURE_ID)) {
        mmkv.remove(SECURE_ID)
      }
      await keys.remove()
    },
  }
}
