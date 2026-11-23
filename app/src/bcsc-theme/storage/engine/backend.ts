export type ReadResult =
  | { status: 'ok'; value: string }
  | { status: 'absent' }
  | { status: 'locked' } // protected until the device unlocks; retried later
  | { status: 'unreadable'; error: unknown }

export interface Backend {
  read(key: string): Promise<ReadResult>
  write(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  contains?(key: string): boolean // MMKV only; used by the key-placement check
}

export type BackendName = 'plain' | 'encrypted' | 'keychain'

// The part of an MMKV instance the engine uses, so tests can pass a Map-backed one
export interface KeyValueStore {
  getString(key: string): string | undefined
  set(key: string, value: string): void
  remove(key: string): boolean
  contains(key: string): boolean
  getAllKeys(): string[]
  clearAll(): void
}
