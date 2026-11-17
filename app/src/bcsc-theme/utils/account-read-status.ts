import { getAccountReadStatus } from 'react-native-bcsc-core'

/**
 * Why a native account read came back empty (missing, unreadable or undecodable storage), as error report context.
 * Call it only after `getAccount` returns null. Status codes only, never paths, IDs or file contents.
 *
 * @returns The read status as context keys, or undefined when it can't be read: a diagnostic must never replace the
 * real failure
 */
export const getAccountReadContext = async (): Promise<Record<string, unknown> | undefined> => {
  let readStatus
  try {
    // try, not .catch(): a missing native method throws synchronously, before there is a promise to catch
    readStatus = await getAccountReadStatus()
  } catch {
    return undefined
  }

  if (!readStatus) {
    return undefined
  }

  return {
    account_read_status: readStatus.status,
    account_read_environment: readStatus.environment,
    account_read_detail: readStatus.detail,
    account_legacy_status: readStatus.legacyStatus,
  }
}
