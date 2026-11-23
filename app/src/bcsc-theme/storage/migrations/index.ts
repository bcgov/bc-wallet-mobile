import { m0001 } from './0001-leave-bifold'
import { m0002 } from './0002-move-native-data'
import { m0003 } from './0003-delete-legacy-data'
import type { Migration } from './types'

export const MIGRATIONS: readonly Migration[] = [m0001, m0002, m0003]
export const LATEST = MIGRATIONS.at(-1)?.version ?? 0
