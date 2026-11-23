import type { KeyValueStore } from './backend'

// Map-backed stand-in for an MMKV instance, used by tests and by the in-memory test environment
export const createMemoryKeyValueStore = (
  initial: Record<string, string> = {}
): KeyValueStore & {
  entries(): Record<string, string>
} => {
  const values = new Map(Object.entries(initial))
  return {
    getString: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value)
    },
    remove: (key) => values.delete(key),
    contains: (key) => values.has(key),
    getAllKeys: () => [...values.keys()],
    clearAll: () => values.clear(),
    entries: () => Object.fromEntries(values),
  }
}
