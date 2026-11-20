// In-memory MMKV for Jest: the real package needs Nitro native modules. One store per instance id.
const instances = new Map<string, Map<string, string | number | boolean>>()

const storeFor = (id: string) => {
  let values = instances.get(id)
  if (!values) {
    values = new Map()
    instances.set(id, values)
  }
  return values
}

export const createMMKV = (config: { id?: string } = {}) => {
  const id = config.id ?? 'mmkv.default'
  const values = storeFor(id)
  return {
    id,
    set: (key: string, value: string | number | boolean) => {
      values.set(key, value)
    },
    getString: (key: string) => {
      const value = values.get(key)
      return typeof value === 'string' ? value : undefined
    },
    getNumber: (key: string) => {
      const value = values.get(key)
      return typeof value === 'number' ? value : undefined
    },
    getBoolean: (key: string) => {
      const value = values.get(key)
      return typeof value === 'boolean' ? value : undefined
    },
    contains: (key: string) => values.has(key),
    remove: (key: string) => values.delete(key),
    getAllKeys: () => [...values.keys()],
    clearAll: () => values.clear(),
  }
}

export const existsMMKV = (id: string) => instances.has(id)

export const deleteMMKV = (id: string) => instances.delete(id)
