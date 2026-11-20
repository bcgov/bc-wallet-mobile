import { LegacyNotReadyError, type Migration, type MigrationContext } from '../migrations/types'
import type { Meta } from './meta'

export type RunResult = { status: 'ok' } | { status: 'locked' } | { status: 'failed'; step: string; attempts: number }

const errorName = (error: unknown) => (error instanceof Error ? error.name : 'unknown')

export const runMigrations = async (
  migrations: readonly Migration[],
  from: number,
  ctx: MigrationContext,
  meta: Meta
): Promise<RunResult> => {
  let version = from
  for (const migration of migrations) {
    if (version >= migration.version) {
      continue
    }
    try {
      await migration.up(ctx)
      await migration.verify(ctx)
    } catch (error) {
      // Locked legacy data waits for the device to unlock; it isn't a failed attempt
      if (error instanceof LegacyNotReadyError && error.status === 'locked') {
        return { status: 'locked' }
      }
      const attempts = meta.recordFailure(migration.version)
      ctx.log('migration.failed', { id: migration.id, attempts, error: errorName(error) })
      return { status: 'failed', step: migration.id, attempts }
    }
    // Last write of the step: a crash before this re-runs the whole step
    meta.setVersion(migration.version)
    meta.clearFailures(migration.version)
    ctx.log('migration.done', { id: migration.id })
    version = migration.version
  }
  return { status: 'ok' }
}
