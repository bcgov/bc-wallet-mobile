import { AppEventCode } from '../events/appEventCode'
import { ErrorDefinition, ErrorRegistry, ErrorRegistryAppEventMap, ErrorRegistryKey } from './errorRegistry'

/**
 * Extract a meaningful message from an unknown error value
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
 * Get error definition by key (useful for custom error handling)
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
