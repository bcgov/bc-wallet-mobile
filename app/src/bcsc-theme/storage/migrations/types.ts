import type { BackendName } from '../engine/backend'
import type { LegacySources } from '../legacy'

export interface MigrationContext {
  legacy: LegacySources // read-only, except m0003's removeAsync
  read(backend: BackendName, key: string): Promise<unknown>
  // 'native' only for a key whose s1 home is still bcsc-core, such as m0001's nickname repair
  put(backend: BackendName, key: string, value: unknown): Promise<void>
  log(event: string, fields: Record<string, string | number>): void // names and counts only, never values
}

export interface Migration {
  version: number // the storage version this step produces
  id: string // stable name for logs
  up(ctx: MigrationContext): Promise<void>
  verify(ctx: MigrationContext): Promise<void> // re-reads storage; throws VerifyError
}

// Names the invariant, never the value: logs leave the device
// Names only what failed (keys and invariants, never values), so the runner logs it
export class VerifyError extends Error {
  constructor(failed: string[]) {
    super(failed.join(','))
    this.name = 'VerifyError'
  }
}

export class LegacyNotReadyError extends Error {
  constructor(
    readonly records: string,
    readonly status: 'locked' | 'unreadable'
  ) {
    super(`legacy ${status}: ${records}`)
    this.name = 'LegacyNotReadyError'
  }
}
