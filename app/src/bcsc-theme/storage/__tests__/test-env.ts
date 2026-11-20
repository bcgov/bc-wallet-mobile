import { createStorage, type Storage, type StorageDeps } from '../create-storage'
import type { Backend, KeyValueStore } from '../engine/backend'
import { createEncryptedBackend, type MmkvConfig, SECURE_ID } from '../engine/encrypted-backend'
import type { KeyStore } from '../engine/key-store'
import { createMemoryKeyValueStore } from '../engine/memory-backend'
import { createMeta } from '../engine/meta'
import { mmkvBackend } from '../engine/mmkv-backend'
import { misplacedKeys as findMisplacedKeys, migrationContext } from '../engine/open'
import { createLegacySources } from '../legacy'
import { BCSC_OWNED_ASYNC_KEYS } from '../legacy/async-storage'
import type { LegacyNativeReader, LegacyRecord, LegacyRecordName, LegacyValues } from '../legacy/native'
import type { Migration } from '../migrations/types'

export class CrashInjected extends Error {
  constructor() {
    super('crash injected')
    this.name = 'CrashInjected'
  }
}

type NativeRecords = { [N in LegacyRecordName]?: LegacyRecord<LegacyValues[N]> }

export interface TestInput {
  async?: Record<string, unknown> // AsyncStorage values, stringified as JSON on the way in
  asyncRaw?: Record<string, string> // AsyncStorage values stored as-is, for corrupt JSON
  native?: NativeRecords
  plain?: Record<string, string>
  encrypted?: Record<string, string>
  encryptionKey?: string
  keychain?: Record<string, string>
  keychainLocked?: boolean
}

export interface TestOptions {
  crashAfterWrite?: number
  migrations?: readonly Migration[]
}

export interface Dump {
  plain: Record<string, unknown>
  encrypted: Record<string, unknown>
  keychain: Record<string, unknown>
  native: Record<string, unknown>
  async: Record<string, unknown>
}

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const parsedEntries = (entries: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(entries)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, parse(v)])
  )

// Everything a device holds, shared across restarts of one test environment
interface Device {
  plain: KeyValueStore & { entries(): Record<string, string> }
  secure?: { key: string; store: KeyValueStore & { entries(): Record<string, string> } }
  keychain: Map<string, string>
  keychainLocked: boolean
  native: NativeRecords
  async: Map<string, string>
}

const newDevice = (input: TestInput): Device => {
  const asyncValues = new Map<string, string>(Object.entries(input.asyncRaw ?? {}))
  for (const [key, value] of Object.entries(input.async ?? {})) {
    asyncValues.set(key, JSON.stringify(value))
  }
  const keychain = new Map(Object.entries(input.keychain ?? {}))
  if (input.encryptionKey) {
    keychain.set('meta/encryption-key', input.encryptionKey)
  }
  return {
    plain: createMemoryKeyValueStore(input.plain),
    secure:
      input.encryptionKey && input.encrypted
        ? { key: input.encryptionKey, store: createMemoryKeyValueStore(input.encrypted) }
        : undefined,
    keychain,
    keychainLocked: input.keychainLocked ?? false,
    native: structuredClone(input.native ?? {}),
    async: asyncValues,
  }
}

export const createTestEnv = (input: TestInput = {}, options: TestOptions = {}) => {
  const device = newDevice(input)
  let writes = 0
  let crashAfter = options.crashAfterWrite
  let keyCounter = 0

  // Counts every write to any backend, so a test can stop the run after exactly n of them
  const write = () => {
    writes += 1
    if (crashAfter !== undefined && writes > crashAfter) {
      throw new CrashInjected()
    }
  }
  const counted = (store: KeyValueStore): KeyValueStore => ({
    ...store,
    set: (key, value) => {
      write()
      store.set(key, value)
    },
    remove: (key) => {
      write()
      return store.remove(key)
    },
    clearAll: () => {
      write()
      store.clearAll()
    },
  })

  const keychainRead = (key: string) => {
    if (device.keychainLocked) {
      return { status: 'locked' } as const
    }
    const value = device.keychain.get(key)
    return value === undefined ? ({ status: 'absent' } as const) : ({ status: 'ok', value } as const)
  }

  const keychain: Backend = {
    read: async (key) => keychainRead(key),
    write: async (key, value) => {
      write()
      device.keychain.set(key, value)
    },
    remove: async (key) => {
      write()
      device.keychain.delete(key)
    },
  }

  const keys: KeyStore = {
    read: async () => keychainRead('meta/encryption-key'),
    create: async () => {
      keyCounter += 1
      const key = `test-key-${keyCounter}`.padEnd(32, '0')
      write()
      device.keychain.set('meta/encryption-key', key)
      return key
    },
    remove: async () => {
      write()
      device.keychain.delete('meta/encryption-key')
    },
  }

  // A wrong key opens an empty view of the file, as MMKV can
  const mmkvFactory = {
    create: (config: MmkvConfig) => {
      if (!device.secure) {
        device.secure = { key: config.encryptionKey, store: createMemoryKeyValueStore() }
      }
      const opened = device.secure.key === config.encryptionKey ? device.secure.store : createMemoryKeyValueStore()
      return counted(opened)
    },
    exists: (id: string) => id === SECURE_ID && device.secure !== undefined,
    remove: () => {
      write()
      device.secure = undefined
    },
  }

  const reader: LegacyNativeReader = {
    readLegacyRecord: async (name) => (device.native[name] ?? { status: 'absent' }) as never,
  }

  const asyncStorage = {
    getItem: async (key: string) => device.async.get(key) ?? null,
    removeItem: async (key: string) => {
      write()
      device.async.delete(key)
    },
  }

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  const removeNative = async () => {
    write()
    device.native = {}
  }

  const build = (): { storage: Storage; deps: StorageDeps } => {
    const plain = counted(device.plain)
    const meta = createMeta(plain)
    const deps: StorageDeps = {
      plain: { ...mmkvBackend(() => plain), clearAll: () => plain.clearAll() },
      encrypted: createEncryptedBackend(keys, mmkvFactory, meta),
      keychain,
      meta,
      legacy: createLegacySources(asyncStorage, reader, removeNative),
      ownedAsyncKeys: BCSC_OWNED_ASYNC_KEYS,
      core: {
        clearAllKeychainData: async () => {
          write()
          device.keychain.clear()
        },
        removeLegacyNativeData: removeNative,
      },
      logger,
      migrations: options.migrations,
    }
    return { storage: createStorage(deps), deps }
  }

  let current = build()

  return {
    get storage() {
      return current.storage
    },
    device,
    logger,
    // A relaunch: same device, fresh process, no crash injection
    restart() {
      crashAfter = undefined
      current = build()
    },
    writes: () => writes,
    // Writes a clean open() makes on this input
    countWrites: async () => {
      const probe = createTestEnv(input, { migrations: options.migrations })
      await probe.storage.open()
      return probe.writes()
    },
    misplacedKeys: () => findMisplacedKeys(current.deps),
    // For running a migration step on its own; open() first, so the encrypted backend is open
    migrationContext: () => migrationContext(current.deps),
    dump: (): Dump => ({
      plain: parsedEntries(device.plain.entries()),
      encrypted: device.secure ? parsedEntries(device.secure.store.entries()) : {},
      // The generated key differs between runs, so only its presence is compared
      keychain: parsedEntries(
        Object.fromEntries(
          [...device.keychain].map(([k, v]) => [k, k === 'meta/encryption-key' ? '<encryption-key>' : v])
        )
      ),
      native: structuredClone(device.native) as Record<string, unknown>,
      async: parsedEntries(Object.fromEntries(device.async)),
    }),
  }
}

export type TestEnv = ReturnType<typeof createTestEnv>
