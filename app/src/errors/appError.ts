import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { ErrorCategory, ErrorDefinition } from './errorRegistry'

type AppErrorOptions = ErrorOptions & {
  /**
   * Whether to automatically track this error in analytics upon creation. Defaults to true.
   */
  track?: boolean
}

export type ErrorIdentity = {
  category: ErrorCategory
  appEvent: AppEventCode
  statusCode: number
}

/**
 * Custom application error class with structured information.
 *
 * @extends {Error}
 * @class
 */
export class AppError extends Error {
  private tracked: boolean // Whether this error has been tracked in analytics

  code: string // ie: network.err_no_internet.2100
  appEvent: AppEventCode // ie: no_internet
  statusCode: number // ie: 2100
  timestamp: string // ISO timestamp of when the error was created
  handled: boolean // Whether this error has been handled by a policy

  constructor(message: string, identity: ErrorIdentity, options?: AppErrorOptions) {
    super(message, options)
    this.name = this.constructor.name

    this.code = `${identity.category}.${identity.appEvent}.${identity.statusCode}` // ie: network.err_no_internet.2100
    this.appEvent = identity.appEvent
    this.statusCode = identity.statusCode
    this.timestamp = new Date().toISOString()
    this.handled = false
    this.tracked = false

    // Track the error in analytics unless explicitly disabled
    if (options?.track !== false) {
      this.track()
    }
  }

  /**
   * Get the technical message from the original error, if available.
   *
   * @returns The technical message or null if not available.
   */
  get technicalMessage(): string | null {
    // QUESTION (MD): Max length? Detect HTML string?
    return this.cause instanceof Error ? this.cause.message : null
  }

  /**
   * Get the full error message, including technical details if available.
   *
   * @example
   * `[network.err_no_internet.2100] No internet connection
   *  Technical: Failed to fetch resource`
   *
   * @returns The full error message string.
   */
  get fullMessage(): string {
    const lines = [`[${this.code}] ${this.message}`]

    if (this.technicalMessage) {
      lines.push(`Debug: ${this.technicalMessage}`)
    }

    return lines.join('\n')
  }

  /**
   * Track the error in analytics.
   *
   * @returns void
   */
  track() {
    if (this.tracked) {
      return
    }

    Analytics.trackErrorEvent({
      /**
       * NOTE: We use AppEventCode as the error code for backwards compatibility with V3 and the
       * existing analytics dashboard. The AppError `code` property (which includes category and
       * status code) would provide better insights — worth considering for a future update.
       */
      code: this.appEvent,
      /**
       * TEMP: Inject the error code into the message to provide additional context.
       */
      message: `[${this.code}] ${this.message}`,
    })

    this.tracked = true
  }

  /**
   * Create an AppError from an ErrorDefinition, with translated title and description.
   *
   * @param definition - The ErrorDefinition to create the AppError from.
   * @param options - Optional AppErrorOptions for additional context.
   * @returns An instance of AppError.
   */
  static fromErrorDefinition(definition: ErrorDefinition, options?: AppErrorOptions): AppError {
    return new AppError(
      definition.message,
      {
        category: definition.category,
        appEvent: definition.appEvent,
        statusCode: definition.statusCode,
      },
      options
    )
  }

  /**
   * Serialize the AppError to a JSON object. Useful for logging.
   *
   * @return An object containing the serialized error details.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      technicalMessage: this.technicalMessage,
      code: this.code,
      timestamp: this.timestamp,
      handled: this.handled,
      cause: this.cause,
    }
  }
}

/**
 * Check if an error is an AppError that has already been handled by an error policy.
 *
 * @param error - The error to check
 * @returns True if the error is an AppError and has been handled
 */
export function isHandledAppError(error: unknown): error is AppError {
  return error instanceof AppError && error.handled
}

/**
 * Check if an error is an instance of AppError, and optionally if it matches a specific app event code.
 *
 * @param error - The error to check
 * @param appEvent - Optional app event code to match against the error's appEvent property
 * @returns True if the error is an AppError (and matches the app event code if provided)
 */
export function isAppError<TAppEventCode extends AppEventCode>(
  error: unknown,
  appEvent?: TAppEventCode
): error is AppError & { appEvent: TAppEventCode } {
  if (appEvent) {
    return error instanceof AppError && error.appEvent === appEvent
  }

  return error instanceof AppError
}
