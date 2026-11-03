import { AppError } from './appError'
import { ErrorDefinition } from './errorRegistry'

// HTTP details worth keeping when an AppError is wrapped by a broader failure
const INHERITED_CONTEXT_KEYS = ['http_route', 'http_method', 'http_status']

type FailureOptions = {
  /** Where in a process the failure happened. ie: quick_login */
  flow: string
  /** Where in a multistep process the failure happened. ie: sign_jwt */
  step: string
  startedAt?: number
  /** The underlying error */
  cause?: unknown
}

/**
 * Creates an AppError that records where and when a multi-step process failed.
 *
 * Step names must never contain personal data or tokens.
 *
 * @param definition - The ErrorDefinition to create the AppError from
 * @param options - The flow, step, start time and cause of the failure
 * @returns An AppError carrying the failure context
 */
export const createFailureError = (
  definition: ErrorDefinition,
  { flow, step, startedAt, cause }: FailureOptions
): AppError => {
  const context: Record<string, unknown> = { failure_flow: flow, failure_step: step }

  if (startedAt !== undefined) {
    context.failure_elapsed_ms = Date.now() - startedAt
  }

  if (cause instanceof AppError) {
    for (const key of INHERITED_CONTEXT_KEYS) {
      if (cause.context[key] !== undefined) {
        context[key] = cause.context[key]
      }
    }
  }

  return AppError.fromErrorDefinition(definition, { cause, context })
}
