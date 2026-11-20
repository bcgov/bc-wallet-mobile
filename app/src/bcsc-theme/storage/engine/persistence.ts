import type { z } from 'zod'
import type { StoreApi } from 'zustand/vanilla'
import type { BCSCStore } from '../slices'
import type { Backend, BackendName } from './backend'
import type { StorageLogger } from './logger'
import type { AnyPersistedKey, PersistedKey } from './persisted-key'

export type KeyStatus = 'ok' | 'absent' | 'locked' | 'unreadable'

export class KeyNotWritableError extends Error {
  constructor(
    readonly key: string,
    readonly status: KeyStatus
  ) {
    super(`Refusing to write ${status} key ${key}`)
    this.name = 'KeyNotWritableError'
  }
}

// What slices see
export interface SlicePersistence {
  write<T, V>(def: PersistedKey<T, V>, value: T): Promise<void>
  update<T, V>(def: PersistedKey<T, V>, fn: (prev: V) => T): Promise<void>
  remove<T, V>(def: PersistedKey<T, V>): Promise<void>
  // Memory only, for after a failed save, so the session carries on with the value it just got (#4645).
  // The backend keeps its old value; the next successful write replaces it.
  remember<T, V>(def: PersistedKey<T, V>, value: T): void
}

interface PersistenceDeps {
  backends: Record<BackendName, Backend>
  logger: StorageLogger
  store: () => StoreApi<BCSCStore>
}

// A null property reads as absent. The app never writes null (JSON.stringify drops undefined), but values imported
// from bcsc-core carry Swift nils as null, and the schemas say optional, not nullable.
const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withoutNulls)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, field]) => field !== null)
        .map(([key, field]) => [key, withoutNulls(field)])
    )
  }
  return value
}

const parseJson = (raw: string): unknown => {
  try {
    return withoutNulls(JSON.parse(raw))
  } catch {
    return undefined
  }
}

// 'account/profile' is state.account.profile; 'preferences' is the data fields of state.preferences
const location = (key: string) => {
  const [slice, field] = key.split('/') as [keyof BCSCStore, string | undefined]
  return { slice, field }
}

const schemaFields = (def: AnyPersistedKey) => Object.keys((def.schema as unknown as z.ZodObject).shape)

export const createPersistence = ({ backends, logger, store }: PersistenceDeps) => {
  const statuses = new Map<string, KeyStatus>()
  const queues = new Map<string, Promise<void>>()

  const current = <V>(def: PersistedKey<unknown, V>): V => {
    const { slice, field } = location(def.key)
    const sliceState = store().getState()[slice] as unknown as Record<string, unknown>
    if (field) {
      return sliceState[field] as V
    }
    // Only the schema's fields, so the slice's actions never reach update()
    return Object.fromEntries(schemaFields(def).map((name) => [name, sliceState[name]])) as V
  }

  // Replaces only these fields and their slice object, so selectors on other slices keep their value. A
  // whole-slice value replaces every field of its schema: one it leaves out goes back to the slice's initial value.
  const put = (def: AnyPersistedKey, value: unknown) => {
    const { slice, field } = location(def.key)
    const initial = store().getInitialState()[slice] as unknown as Record<string, unknown>
    const fields = field
      ? { [field]: value }
      : {
          ...Object.fromEntries(schemaFields(def).map((name) => [name, initial[name]])),
          ...(value as Record<string, unknown>),
        }
    store().setState((state) => ({ [slice]: { ...state[slice], ...fields } }) as Partial<BCSCStore>)
  }

  // One write at a time per key, so update() never works from a stale value.
  // Failures are logged here (key and error name only, never the value) and still reach the caller.
  const enqueue = (key: string, write: () => Promise<void>) => {
    const run = (queues.get(key) ?? Promise.resolve()).then(write).catch((error: unknown) => {
      logger.error(`storage write failed: ${key}`, { error: error instanceof Error ? error.name : 'unknown' })
      throw error
    })
    queues.set(
      key,
      run.catch(() => undefined)
    )
    return run
  }

  // Saved to the backend first, then to memory
  const save = async <T>(def: PersistedKey<T, unknown>, value: T) => {
    const status = statuses.get(def.key) ?? 'absent'
    if (status === 'locked' || status === 'unreadable') {
      throw new KeyNotWritableError(def.key, status)
    }
    const parsed = def.schema.parse(value)
    await backends[def.backend].write(def.key, JSON.stringify(parsed))
    statuses.set(def.key, 'ok')
    put(def as AnyPersistedKey, parsed)
  }

  const slices: SlicePersistence = {
    remember: (def, value) => {
      logger.warn(`storage value kept in memory only: ${def.key}`)
      put(def as AnyPersistedKey, def.schema.parse(value))
    },
    write: (def, value) => enqueue(def.key, () => save(def, value)),
    update: (def, fn) => enqueue(def.key, () => save(def, fn(current(def)))),
    // Removing is how an unreadable key gets recovered, so it is always allowed
    remove: (def) =>
      enqueue(def.key, async () => {
        await backends[def.backend].remove(def.key)
        statuses.set(def.key, 'absent')
        put(def as AnyPersistedKey, def.initial)
      }),
  }

  // The bad value stays on disk until the next write replaces it
  const unreadable = (def: AnyPersistedKey): KeyStatus => {
    put(def, def.initial)
    if (def.onUnreadable === 'initial') {
      logger.warn(`storage key unreadable, using initial value: ${def.key}`)
      statuses.set(def.key, 'ok')
      return 'ok'
    }
    statuses.set(def.key, 'unreadable')
    return 'unreadable'
  }

  // Engine only: open() loads every key, wipe() resets
  const load = async (def: AnyPersistedKey): Promise<KeyStatus> => {
    const read = await backends[def.backend].read(def.key)
    if (read.status === 'unreadable') {
      return unreadable(def)
    }
    if (read.status !== 'ok') {
      statuses.set(def.key, read.status)
      put(def, def.initial)
      return read.status
    }
    const parsed = def.schema.safeParse(parseJson(read.value))
    if (!parsed.success) {
      return unreadable(def)
    }
    statuses.set(def.key, 'ok')
    put(def, parsed.data)
    return 'ok'
  }

  return {
    slices,
    load,
    status: (key: string): KeyStatus => statuses.get(key) ?? 'absent',
    reset: () => statuses.clear(),
  }
}

export type Persistence = ReturnType<typeof createPersistence>
