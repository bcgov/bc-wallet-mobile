import { z } from 'zod'
import type { BackendName } from './backend'

// V is T when the key has an initial value, otherwise T | undefined
export interface PersistedKey<T, V = T | undefined> {
  readonly key: string // '<slice>/<field>' for one field, '<slice>' for the whole slice
  readonly schema: z.ZodType<T>
  readonly backend: BackendName
  readonly initial: V
  readonly onUnreadable: 'block' | 'initial'
}

export type AnyPersistedKey = PersistedKey<unknown, unknown>

interface Definition<T> {
  key: string
  schema: z.ZodType<T>
  backend: BackendName
  // 'initial': an unreadable value is replaced by the initial value instead of blocking startup
  onUnreadable?: 'block' | 'initial'
}

export function persistedKey<T>(def: Definition<T> & { initial: T }): PersistedKey<T, T>
export function persistedKey<T>(def: Definition<T>): PersistedKey<T, T | undefined>
export function persistedKey<T>(def: Definition<T> & { initial?: T }): PersistedKey<T, T | undefined> {
  // Checked once at startup: persistence picks a whole-slice key's fields from its schema
  if (!def.key.includes('/') && (!(def.schema instanceof z.ZodObject) || def.initial === undefined)) {
    throw new Error(`Whole-slice key ${def.key} needs an object schema and an initial value`)
  }
  if (def.onUnreadable === 'initial' && def.initial === undefined) {
    throw new Error(`Key ${def.key} can only fall back if it has an initial value`)
  }
  return { ...def, initial: def.initial, onUnreadable: def.onUnreadable ?? 'block' }
}
