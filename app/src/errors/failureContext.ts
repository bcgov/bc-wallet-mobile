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
 * The cause's own code, so a report can be filtered by what failed and not only by where: an AppError's
 * code (ie: storage.no_signing_keys.2616), or a native module's error code (ie: E_NO_KEYS_FOUND).
 * The wrapping AppError's code alone would hide it, and technicalMessage carries no AppError code.
 */
const getCauseCode = (cause: unknown): string | undefined => {
  if (cause instanceof AppError) {
    return cause.code
  }

  const code = (cause as { code?: unknown } | undefined)?.code
  return cause instanceof Error && typeof code === 'string' ? code : undefined
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

  const causeCode = getCauseCode(cause)

  if (causeCode !== undefined) {
    context.failure_cause_code = causeCode
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
