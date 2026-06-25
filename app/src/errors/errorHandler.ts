import { UNKNOWN_APP_ERROR_STATUS_CODE } from '@/constants'
import { BifoldError } from '@bifold/core'
import { AppEventCode } from '../events/appEventCode'
import { AppError } from './appError'
import { ErrorDefinition, ErrorRegistry, ErrorRegistryAppEventMap, ErrorRegistryKey } from './errorRegistry'

// TODO (MD): Rename file to errorUtils or something similar

/**
 * Extract a meaningful message from an unknown error value
 *
 * @param error - The unknown error value to extract a message from
 * @returns A string message extracted from the error, or a fallback message if extraction fails
 */
export function extractErrorMessage(error: unknown): string {
  if (error == null) {
    return ''
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  try {
    return JSON.stringify(error)
  } catch {
    // JSON.stringify failed (e.g., circular reference), return type info instead
    return `[Non-serializable ${typeof error}]`
  }
}

/**
 * Signatures emitted by the OS when a write fails because the disk is full.
 *
 * - iOS (NSFileWriteOutOfSpaceError): `You can't save the file "x.jpg" because the volume "User" is out of space.`
 * - POSIX/Android (ENOSPC): `write failed: ENOSPC (No space left on device)`
 * - SQLite (SQLITE_FULL): `database or disk is full`
 */
const OUT_OF_STORAGE_PATTERNS: RegExp[] = [
  /out of space/i,
  /no space left on device/i,
  /\bENOSPC\b/,
  /\bSQLITE_FULL\b/i,
  /database or disk is full/i,
  /not enough (?:free |disk |storage )?space/i,
]

/**
 * Detect whether an error (or anything in its cause chain) was ultimately caused by
 * the device running out of disk space, so callers can show actionable "free up space"
 * guidance instead of a generic storage failure message.
 *
 * @param error - The error to inspect, including its nested `cause` chain
 * @returns True if any error in the chain matches a known out-of-disk-space signature
 */
export function isDeviceStorageFullError(error: unknown): boolean {
  let current: unknown = error

  // Bounded walk of the cause chain to guard against cycles
  for (let depth = 0; current != null && depth < 10; depth++) {
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && code.toUpperCase() === 'ENOSPC') {
      return true
    }

    const message = extractErrorMessage(current)
    if (OUT_OF_STORAGE_PATTERNS.some((pattern) => pattern.test(message))) {
      return true
    }

    current = (current as { cause?: unknown }).cause
  }

  return false
}

/**
 * Get error definition by key (useful for custom error handling)
 *
 * @param errorKey - The key of the error definition to retrieve from the ErrorRegistry.
 * @returns The ErrorDefinition associated with the provided errorKey.
 */
export function getErrorDefinition(errorKey: ErrorRegistryKey): ErrorDefinition {
  return ErrorRegistry[errorKey]
}

/**
 * Get error definition from app event code
 *
 * @param appEvent - The application event code to look up.
 * @returns The corresponding ErrorDefinition or null if not found.
 */
export const getErrorDefinitionFromAppEventCode = (appEvent?: string): ErrorDefinition | null => {
  return ErrorRegistryAppEventMap.get(appEvent as AppEventCode) ?? null
}

/**
 * Gets an AppError from the ErrorRegistry or fallback to `UNKNOWN_ERROR`
 *
 * @param event - The app event code to create the error for
 * @param cause - An optional cause (e.g., an underlying error) that provides additional context for the AppError
 * @returns An instance of AppError corresponding to the provided app event code and cause
 */
export const getRegistryAppError = (event: AppEventCode, cause?: unknown): AppError => {
  const errorDefinition = getErrorDefinitionFromAppEventCode(event) ?? ErrorRegistry.UNKNOWN_ERROR
  return AppError.fromErrorDefinition(errorDefinition, { cause })
}

/**
 * Ensures that an unknown error is returned as an instance of AppError, using a fallback app event code if the original error is not already an AppError.
 *
 * @param error - The unknown error to ensure as an AppError
 * @param fallbackEvent - The app event code to use for the new AppError if the provided error is not already an AppError (default: AppEventCode.UNKNOWN_APP_ERROR)
 * @returns An instance of AppError
 */
export const ensureAppError = (error: unknown, fallbackEvent = AppEventCode.UNKNOWN_APP_ERROR): AppError => {
  if (error instanceof AppError) {
    return error
  }

  return getRegistryAppError(fallbackEvent, error)
}

/**
 * Converts an Error or AppError into a BifoldError, preserving as much information as possible for display in the UI.
 *
 * @param title - The title to display for the error
 * @param description - A user-friendly description of the error
 * @param error - The original error object to convert
 * @returns A BifoldError containing the provided title, description, and details from the original error
 */
export const toBifoldError = (title: string, description: string, error: Error | AppError): BifoldError => {
  let bifoldError: BifoldError

  if (error instanceof AppError) {
    bifoldError = new BifoldError(title, description, error.fullMessage, error.statusCode)
  } else {
    bifoldError = new BifoldError(title, description, error.message, UNKNOWN_APP_ERROR_STATUS_CODE)
  }

  // Attach the cause and stack trace for debugging purposes
  bifoldError.cause = error.cause
  bifoldError.stack = error.stack

  return bifoldError
}
