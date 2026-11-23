import type { StorageDeps } from '../create-storage'
import type { Migration, MigrationContext } from '../migrations/types'
import { PERSISTED_KEYS } from '../slices'
import type { Backend, BackendName } from './backend'
import type { Persistence } from './persistence'
import { runMigrations } from './runner'

export type OpenResult =
  | { status: 'ok' }
  | { status: 'locked' } // waits for the device to unlock, then retries by itself
  | { status: 'newer-version' } // block with "please update"; write nothing
  | { status: 'not-ready'; reason: 'key-missing' | 'wrong-key' | 'store-unreadable' | 'legacy-unreadable' }
  | { status: 'migration-failed'; step: string; attempts: number }
  | { status: 'unreadable'; keys: string[] }

type OpenDeps = StorageDeps & { migrations: readonly Migration[] }

const backendsOf = (deps: StorageDeps): Record<BackendName, Backend> => ({
  plain: deps.plain,
  encrypted: deps.encrypted,
  keychain: deps.keychain,
})

export const migrationContext = (deps: StorageDeps): MigrationContext => {
  const backends = backendsOf(deps)
  return {
    legacy: deps.legacy,
    read: async (backend, key) => {
      const read = await backends[backend].read(key)
      return read.status === 'ok' ? JSON.parse(read.value) : undefined
    },
    put: (backend, key, value) => backends[backend].write(key, JSON.stringify(value)),
    log: (event, fields) => deps.logger.info(`storage ${event}`, fields),
  }
}

// A key found in the other MMKV instance means a migration and a slice disagree; it would read as absent
const otherMmkv = (deps: StorageDeps, backend: BackendName): Backend | undefined => {
  if (backend === 'plain') {
    return deps.encrypted
  }
  if (backend === 'encrypted') {
    return deps.plain
  }
  return undefined
}

export const misplacedKeys = (deps: StorageDeps): string[] =>
  PERSISTED_KEYS.filter((def) => otherMmkv(deps, def.backend)?.contains?.(def.key)).map((def) => def.key)

// No storage version yet: the version the steps start from, or why open stops here
const firstOpen = async (deps: OpenDeps, latest: number, wipe: () => Promise<void>): Promise<number | OpenResult> => {
  const legacy = await deps.legacy.detect()
  if (legacy === 'locked') {
    return { status: 'locked' }
  }
  if (legacy === 'unreadable') {
    return { status: 'not-ready', reason: 'legacy-unreadable' }
  }
  if (legacy === 'none') {
    // iOS keeps keychain items across a reinstall; a fresh install starts from nothing
    await wipe()
    deps.meta.setVersion(latest)
    return latest
  }
  return 0
}

export const createOpen = (deps: OpenDeps, persistence: Persistence, wipe: () => Promise<void>) => {
  const latest = deps.migrations.at(-1)?.version ?? 0

  return async (): Promise<OpenResult> => {
    if (deps.meta.wipeInProgress()) {
      await wipe()
    }

    let from = deps.meta.version()
    if (from !== undefined && from > latest) {
      return { status: 'newer-version' }
    }

    if (from === undefined) {
      const start = await firstOpen(deps, latest, wipe)
      if (typeof start !== 'number') {
        return start
      }
      from = start
    }

    const encrypted = await deps.encrypted.open()
    if (encrypted === 'locked') {
      return { status: 'locked' }
    }
    if (encrypted !== 'opened') {
      return { status: 'not-ready', reason: encrypted === 'unreadable' ? 'store-unreadable' : encrypted }
    }

    const run = await runMigrations(deps.migrations, from, migrationContext(deps), deps.meta)
    if (run.status === 'locked') {
      return { status: 'locked' }
    }
    if (run.status === 'failed') {
      return { status: 'migration-failed', step: run.step, attempts: run.attempts }
    }

    const statuses = await Promise.all(PERSISTED_KEYS.map((def) => persistence.load(def)))
    if (statuses.includes('locked')) {
      return { status: 'locked' }
    }
    const unreadable = PERSISTED_KEYS.filter((_, i) => statuses[i] === 'unreadable').map((def) => def.key)
    const blocked = [...unreadable, ...misplacedKeys(deps)]
    if (blocked.length > 0) {
      deps.logger.error('storage open blocked', { keys: blocked.join(',') })
      return { status: 'unreadable', keys: blocked }
    }
    return { status: 'ok' }
  }
}
