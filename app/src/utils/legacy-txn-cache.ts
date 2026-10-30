import { removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { BifoldLogger } from '@bifold/core'
import { CachesDirectoryPath } from 'react-native-fs'

// 4.1.x stored the indy-vdr ledger cache here; since #4793 it is in memory and nothing reads this folder.
// Best effort: a failure or interrupted delete is retried on the next launch.
export const removeLegacyTxnCache = (logger: BifoldLogger): Promise<void> =>
  removeFileSafely(`${CachesDirectoryPath}/txn-cache`, logger)
