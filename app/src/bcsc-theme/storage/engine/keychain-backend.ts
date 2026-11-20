import type * as Keychain from 'react-native-keychain'
import type { Backend } from './backend'
import { isDeviceLockedError } from './keychain-errors'

export type KeychainApi = Pick<typeof Keychain, 'getGenericPassword' | 'setGenericPassword' | 'resetGenericPassword'>

const service = (key: string) => `bcsc.storage.${key}`

export const keychainBackend = (keychain: KeychainApi, accessible: Keychain.ACCESSIBLE): Backend => ({
  read: async (key) => {
    try {
      const item = await keychain.getGenericPassword({ service: service(key) })
      if (!item) {
        return { status: 'absent' }
      }
      return { status: 'ok', value: item.password }
    } catch (error) {
      if (isDeviceLockedError(error)) {
        return { status: 'locked' }
      }
      return { status: 'unreadable', error }
    }
  },
  write: async (key, value) => {
    const result = await keychain.setGenericPassword(key, value, { service: service(key), accessible })
    if (result === false) {
      throw new Error(`keychain write refused: ${key}`)
    }
  },
  remove: async (key) => {
    await keychain.resetGenericPassword({ service: service(key) })
  },
})
