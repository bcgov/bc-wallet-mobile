import { AppError } from './appError'

// How many AppErrors to follow looking for the native rejection beneath them
const MAX_NATIVE_SEARCH_DEPTH = 10

const NATIVE_USER_INFO_FIELDS: Record<string, string> = {
  site: 'native_site',
  detail: 'native_detail',
  osStatus: 'native_os_status',
}

type NativeRejection = Error & { code: string; userInfo?: unknown }

/**
 * Whether an error is a React Native native-module rejection. React Native gives these a string `code` and a
 * `userInfo` key (null when the reject passed none) or a native stack. The extra checks matter: Axios errors also
 * carry a string `code` (ie: ERR_NETWORK).
 */
const isNativeRejection = (error: unknown): error is NativeRejection => {
  if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string') {
    return false
  }

  return 'userInfo' in error || 'nativeStackIOS' in error || 'nativeStackAndroid' in error
}

/**
 * Returns the native rejection an AppError wraps, however deep in the cause chain
 */
const findNativeRejection = (error: AppError): NativeRejection | undefined => {
  let current: unknown = error.cause

  for (let depth = 0; depth < MAX_NATIVE_SEARCH_DEPTH && current !== undefined; depth++) {
    if (isNativeRejection(current)) {
      return current
    }

    if (!(current instanceof AppError)) {
      return undefined
    }

    current = current.cause
  }

  return undefined
}

/**
 * Flattens the native code and diagnostics of the native rejection beneath an AppError
 *
 * @param error - The reported AppError
 * @returns The fields, or an empty object when no native rejection is in the cause chain
 */
export const getNativeErrorFields = (error: AppError): Record<string, unknown> => {
  const rejection = findNativeRejection(error)

  if (!rejection) {
    return {}
  }

  const fields: Record<string, unknown> = { native_code: rejection.code }
  const userInfo = rejection.userInfo

  if (userInfo === null || typeof userInfo !== 'object') {
    return fields
  }

  for (const [key, field] of Object.entries(NATIVE_USER_INFO_FIELDS)) {
    const value = (userInfo as Record<string, unknown>)[key]

    // Scalars only, so an unexpected shape can't put a large or nested value at the top level
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      fields[field] = value
    }
  }

  return fields
}
