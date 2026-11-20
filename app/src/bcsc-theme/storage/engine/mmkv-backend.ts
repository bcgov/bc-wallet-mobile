import type { Backend, KeyValueStore } from './backend'

// MMKV is synchronous; the Promise executor turns a throw into a rejection
export const mmkvBackend = (instance: () => KeyValueStore): Backend => ({
  read: (key) =>
    new Promise((resolve) => {
      try {
        const value = instance().getString(key)
        resolve(value === undefined ? { status: 'absent' } : { status: 'ok', value })
      } catch (error) {
        resolve({ status: 'unreadable', error })
      }
    }),
  write: (key, value) =>
    new Promise((resolve) => {
      instance().set(key, value)
      resolve()
    }),
  remove: (key) =>
    new Promise((resolve) => {
      instance().remove(key)
      resolve()
    }),
  contains: (key) => instance().contains(key),
})
