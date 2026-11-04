import { AppError } from './appError'
import { ErrorDefinition } from './errorRegistry'

// HTTP details worth keeping when an AppError is wrapped by a broader failure
const INHERITED_CONTEXT_KEYS = ['http_route', 'http_method', 'http_status']

// Where a flow failed, kept when an already-labeled error is wrapped for its alert
const FAILURE_CONTEXT_KEYS = ['failure_flow', 'failure_step', 'failure_elapsed_ms', 'failure_cause_code']

// Health of things that fail silently (push tokens, the native account read), kept when an error is wrapped
const DIAGNOSTIC_CONTEXT_KEYS = [
  'push_fcm_status',
  'push_apns_status',
  'account_read_status',
  'account_read_environment',
  'account_read_detail',
  'account_legacy_status',
]

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

const buildFailureContext = ({ flow, step, startedAt }: FailureLocation): Record<string, unknown> => {
  const context: Record<string, unknown> = { failure_flow: flow, failure_step: step }

  if (startedAt !== undefined) {
    context.failure_elapsed_ms = Date.now() - startedAt
  }

  return context
}

/**
 * The cause's own code, so a report can be filtered by what failed
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
  { cause, context: extraContext, ...location }: FailureOptions
): AppError => {
  const context = { ...extraContext, ...buildFailureContext(location) }

  const causeCode = getCauseCode(cause)

  if (causeCode !== undefined) {
    context.failure_cause_code = causeCode
  }

  if (cause instanceof AppError) {
    for (const key of [...INHERITED_CONTEXT_KEYS, ...DIAGNOSTIC_CONTEXT_KEYS]) {
      if (cause.context[key] !== undefined) {
        context[key] = cause.context[key]
      }
    }
  }

  return AppError.fromErrorDefinition(definition, { cause, context })
}

/**
 * Adds the failed step to an existing AppError without wrapping it.
 * Prefer this over {@link createFailureError} when the error's code is already specific (ie: no_internet).
 *
 * Step names must never contain personal data or tokens.
 *
 * @param error - The AppError to annotate; it is changed in place
 * @param location - The flow, step and start time of the failure
 * @returns The same AppError, now carrying the failure context
 */
export const addFailureContext = (error: AppError, location: FailureLocation): AppError => {
  error.addContext(buildFailureContext(location))
  return error
}

/**
 * Wraps an error in a broader definition for its alert, keeping the HTTP and failure context of the error.
 *
 * @param definition - The ErrorDefinition to wrap the error in
 * @param cause - The error to wrap
 * @returns An AppError with the error as its cause and its context copied over
 */
export const wrapKeepingFailureContext = (definition: ErrorDefinition, cause: unknown): AppError => {
  const context: Record<string, unknown> = {}

  if (cause instanceof AppError) {
    for (const key of [...INHERITED_CONTEXT_KEYS, ...FAILURE_CONTEXT_KEYS, ...DIAGNOSTIC_CONTEXT_KEYS]) {
      if (cause.context[key] !== undefined) {
        context[key] = cause.context[key]
      }
    }
  }

  // The cause's own code, unless it already recorded a deeper one
  const causeCode = getCauseCode(cause)

  if (context.failure_cause_code === undefined && causeCode !== undefined) {
    context.failure_cause_code = causeCode
  }

  return AppError.fromErrorDefinition(definition, { cause, context })
}

type StepOptions = {
  /** Wrap a failure in this definition instead of the flow's. ie: MISSING_JWK_ERROR for a missing key */
  definition?: ErrorDefinition
  /**
   * Keep an AppError's own code and only add where it failed, instead of wrapping it. For steps whose
   * errors already name the exact failure, such as a request (ie: no_internet, or an HTTP status).
   */
  keepAppError?: boolean
}

export type FailureSteps<TStep extends string> = {
  /** Runs one step of the flow, rethrowing any failure labeled with that step */
  run: <T>(step: TStep, work: () => Promise<T>, options?: StepOptions) => Promise<T>
  /**
   * Labels an error as a failure at a step
   */
  fail: (step: TStep, error: unknown, options?: StepOptions) => AppError
  /**
   * Records diagnostics (status codes only, never personal data or tokens) to attach to any later failure,
   * ie: whether push tokens were placeholders. Labels win over a note with the same key.
   */
  note: (context: Record<string, unknown>) => void
}

/**
 * Tracks the steps of a multi-step flow so any failure reports which step it happened at and how long the
 * flow had been running. Every step follows the same rules:
 *
 * 1. If the error is already labeled with a step, it is left unchanged
 * 2. If the error is a handled AppError, or an AppError with `keepAppError`, it gains the failure context in place.
 * 3. Anything else is wrapped with a step, with the error as its cause.
 *
 * @param flow - The name of the flow. ie: quick_login
 * @param options - The definition failures are wrapped in unless a step overrides it
 * @returns `run`, `fail` and `note`, sharing the flow's start time and notes
 */
export const trackFailureSteps = <TStep extends string>(
  flow: string,
  { definition }: { definition: ErrorDefinition }
): FailureSteps<TStep> => {
  const startedAt = Date.now()
  const notes: Record<string, unknown> = {}

  const note = (context: Record<string, unknown>) => {
    Object.assign(notes, context)
  }

  const fail = (step: TStep, error: unknown, options: StepOptions = {}): AppError => {
    // this has already been labeled, leave it as is
    if (error instanceof AppError && error.context.failure_step !== undefined) {
      return error
    }

    const location = { flow, step, startedAt }

    // add error context for handled or keepAppError errors
    if (error instanceof AppError && (error.handled || options.keepAppError)) {
      error.addContext(notes)
      return addFailureContext(error, location)
    }

    return createFailureError(options.definition ?? definition, { ...location, cause: error, context: notes })
  }

  const run = async <T>(step: TStep, work: () => Promise<T>, options?: StepOptions): Promise<T> => {
    try {
      return await work()
    } catch (error) {
      throw fail(step, error, options)
    }
  }

  return { run, fail, note }
}
