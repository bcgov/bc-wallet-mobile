import { AppError } from '@/errors'
import { getRegistryAppError } from '@/errors/errorHandler'
import { ErrorDefinition } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'

/**
 * Wraps any caught error as an AppError using the provided definition.
 * The original error is preserved in the cause chain for debugging.
 *
 * @param error The original error to wrap
 * @param identifier The error identifier, which can be either an AppEventCode or an ErrorDefinition
 * @returns An AppError instance that wraps the original error
 */
export function toAppError(error: unknown, event: AppEventCode): AppError
export function toAppError(error: unknown, definition: ErrorDefinition): AppError
export function toAppError(error: unknown, identifier: AppEventCode | ErrorDefinition): AppError {
  if (typeof identifier === 'string') {
    return getRegistryAppError(identifier, error)
  }

  return AppError.fromErrorDefinition(identifier, { cause: error })
}

/**
 * Throwing variant of {@link toAppError}.
 */
export const throwAppError = (error: unknown, definition: ErrorDefinition): never => {
  throw toAppError(error, definition)
}
