import { AppError } from './appError'
import { ErrorDefinition } from './errorRegistry'

/*
  Failure context lives on the error that was thrown
  Readers merge it from the cause chain via AppError.getChainedContext().
*/

type FailureLocation = {
  /** Where in a process the failure happened. ie: quick_login */
  flow: string
  /** Where in a multistep process the failure happened. ie: sign_jwt */
  step: string
  startedAt?: number
}

type FailureOptions = FailureLocation & {
  /** The underlying error */
  cause?: unknown
  /** Extra diagnostics, ie: push token or account read status. Never personal data or tokens. */
  context?: Record<string, unknown>
}

/**
 * Returns the error code for an AppError or an Error; or an undefined
 *
 * @param error - Any thrown error
 * @returns The code or undefined
 */
const getErrorCode = (error: unknown): string | undefined => {
  if (error instanceof AppError) {
    return error.code
  }

  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    return error.code
  }

  return undefined
}

/**
 * Tags the failure with which step failed, the start time and code of the error
 *
 * @param location - The flow and step that failed, and when the flow started
 * @param failed - The error that failed the step, used for `failure_cause_code` when it has a code
 * @returns `failure_flow` and `failure_step`, plus `failure_elapsed_ms` and `failure_cause_code` when known
 */
const buildFailureContext = ({ flow, step, startedAt }: FailureLocation, failed: unknown): Record<string, unknown> => {
  const context: Record<string, unknown> = { failure_flow: flow, failure_step: step }

  if (startedAt !== undefined) {
    context.failure_elapsed_ms = Date.now() - startedAt
  }

  const code = getErrorCode(failed)

  if (code !== undefined) {
    context.failure_cause_code = code
  }

  return context
}

/**
 * Creates an AppError that records where and when a step has failed.
 *
 * Step names must never contain personal data or tokens.
 *
 * @param definition - The ErrorDefinition to create the AppError from
 * @param options - The flow, step, start time and cause of the failure
 * @returns An AppError carrying the failure context
 */
export const createFailureError = (
  definition: ErrorDefinition,
  { cause, context, ...location }: FailureOptions
): AppError => {
  return AppError.fromErrorDefinition(definition, {
    cause,
    context: { ...context, ...buildFailureContext(location, cause) },
  })
}

type StepOptions = {
  /** Wrap a failure in this definition instead of the flow's. ie: MISSING_JWK_ERROR for a missing key */
  definition?: ErrorDefinition
  /**
   * Keep an AppError's own code and only add where it failed, instead of wrapping it. For steps whose
   * errors already name the exact failure, such as a request (ie: no_internet, or an HTTP status).
   */
  keepAppError?: boolean
  /**
   * Diagnostics that could explain a failure at this step, ie: push token status on the request that sends
   * them. Status codes only, never personal data or tokens. The step's own labels win over the same key.
   */
  context?: Record<string, unknown>
}

export type FailureSteps<TStep extends string> = {
  /** Runs one step of the flow, rethrowing any failure labeled with that step */
  run: <T>(step: TStep, work: () => Promise<T>, options?: StepOptions) => Promise<T>
  /**
   * Labels an error as a failure at a step
   */
  fail: (step: TStep, error: unknown, options?: StepOptions) => AppError
}

/**
 * Tracks the steps of a multi-step work flow so any failure tracks where it happened and how long it's been running for.
 *
 * A failing step:
 * 1. Rethrows an error already labeled with a step
 * 2. Labels a handled AppError or any AppError when `keepAppError` is set
 * 3. Otherwise wraps the error with a step
 *
 * @param flow - The name of the flow. ie: quick_login
 * @param options - The definition failures are wrapped in unless a step overrides it
 * @returns `run` and `fail`, sharing the flow's start time
 */
export const trackFailureSteps = <TStep extends string>(
  flow: string,
  { definition }: { definition: ErrorDefinition }
): FailureSteps<TStep> => {
  const startedAt = Date.now()

  const fail = (step: TStep, error: unknown, options: StepOptions = {}): AppError => {
    // Already labeled by an inner step: the innermost step is where it really failed. Only the error's own
    // context counts, so a stale label deeper in the chain (e.g. from another flow) can't skip this flow's wrap
    if (error instanceof AppError && error.context.failure_step !== undefined) {
      return error
    }

    const location = { flow, step, startedAt }

    // Label in place, so a handled error stays handled and a specific code (ie: an HTTP status) is kept
    if (error instanceof AppError && (error.handled || options.keepAppError)) {
      error.addContext({ ...options.context, ...buildFailureContext(location, error) })
      return error
    }

    return createFailureError(options.definition ?? definition, { ...location, cause: error, context: options.context })
  }

  const run = async <T>(step: TStep, work: () => Promise<T>, options?: StepOptions): Promise<T> => {
    try {
      return await work()
    } catch (error) {
      throw fail(step, error, options)
    }
  }

  return { run, fail }
}
