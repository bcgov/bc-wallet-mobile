import { AppError } from '@/errors'
import { ErrorDefinition } from '@/errors/errorRegistry'

/**
 * Wraps any caught error as an AppError using the provided definition.
 * The original error is preserved in the cause chain for debugging.
 */
export const toAppError = (error: unknown, definition: ErrorDefinition): AppError =>
  AppError.fromErrorDefinition(definition, { cause: error })

/**
 * Throwing variant of {@link toAppError}.
 */
export const throwAppError = (error: unknown, definition: ErrorDefinition): never => {
  throw toAppError(error, definition)
}
