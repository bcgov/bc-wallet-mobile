import { navigationRef } from '@/contexts/NavigationContainerContext'
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
 * Reduce a `cause` to a small, safe-to-serialize summary.
 *
 * The raw cause of an HTTP failure is often an AxiosError whose `config.data` holds the
 * full request body — for an evidence upload that is the multi-MB photo/video Buffer.
 * Serializing it (JSON.stringify expands a Buffer to a per-byte number array) can exhaust
 * memory, so toJSON() keeps only lightweight identifying fields and drops the nested
 * chain/body. The live `cause` property is left untouched for runtime logic.
 */
const summarizeCause = (cause: unknown): unknown => {
  if (!(cause instanceof Error)) {
    return cause
  }

  const { code, status, userInfo } = cause as { code?: unknown; status?: unknown; userInfo?: unknown }
  const summary: Record<string, unknown> = { name: cause.name, message: cause.message }
  if (code !== undefined) {
    summary.code = code
  }
  if (status !== undefined) {
    summary.status = status
  }
  if (userInfo !== undefined) {
    // Native-module rejections carry small, bridge-serializable diagnostics here
    summary.userInfo = userInfo
  }
  return summary
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
  screen: string | undefined // Active screen name at the time the error was created
  url?: string // API endpoint URL that produced this error, if applicable
  method?: string // HTTP method of the request that produced this error, if applicable

  constructor(message: string, identity: ErrorIdentity, options?: AppErrorOptions) {
    super(message, options)
    this.name = this.constructor.name

    this.code = `${identity.category}.${identity.appEvent}.${identity.statusCode}` // ie: network.err_no_internet.2100
    this.appEvent = identity.appEvent
    this.statusCode = identity.statusCode
    this.timestamp = new Date().toISOString()
    this.handled = false
    this.tracked = false
    this.screen = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined
    this.url = undefined
    this.method = undefined

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
    // QUESTION (MD): Should we have a max length? Or detect HTML strings or other non-user-friendly content and truncate/remove it?
    if (!(this.cause instanceof Error)) {
      return null
    }

    const cause = this.cause as Error & { code?: unknown; isAxiosError?: boolean }

    // AxiosErrors have their error code written into cause.code
    // That value is already captured in appEvent, so excluding it here
    // keeps technicalMessage as server description, which error policies policies match against
    const isAxiosError = Boolean(cause.isAxiosError) || cause.name === 'AxiosError'

    // For non-Axios errors (e.g. native module errors), cause.code is a meaningful prefix like "E_KEY_NOT_FOUND"
    const code = !isAxiosError && typeof cause.code === 'string' ? cause.code : undefined

    return [code, cause.message].filter(Boolean).join(': ')
  }

  /**
   * Get the full error message, including technical details if available.
   *
   * @example
   * `No internet connection
   * Debug: [network.err_no_internet.2100] Failed to fetch resource`
   *
   * @returns The full error message string.
   */
  get fullMessage(): string {
    let formattedMessage = this.message

    formattedMessage += `\nDebug: [${this.code}]`

    if (this.technicalMessage) {
      formattedMessage += ` ${this.technicalMessage}`
    }

    if (this.screen) {
      formattedMessage += `\nScreen: ${this.screen}`
    }

    if (this.url) {
      const request = this.method ? `${this.method} ${this.url}` : this.url
      formattedMessage += `\nRequest: ${request}`
    }

    return formattedMessage
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

    // Surface the HTTP context (status + endpoint) when the cause is an HTTP/Axios error. Axios collapses
    // every 4xx into a single code, so without this the dashboard cannot tell 400/401/403/404 apart — nor
    // which endpoint produced the error.
    const httpStatus = (this.cause as { response?: { status?: number } } | undefined)?.response?.status
    const request = [this.method, this.url].filter(Boolean).join(' ')
    const context = [httpStatus ? `HTTP ${httpStatus}` : undefined, request || undefined].filter(Boolean).join(' ')

    Analytics.trackErrorEvent({
      /**
       * NOTE: We use AppEventCode as the error code for backwards compatibility with V3 and the
       * existing analytics dashboard. The AppError `code` property (which includes category and
       * status code) would provide better insights — worth considering for a future update.
       */
      code: this.appEvent,
      /**
       * TEMP: Inject the error code (plus HTTP status + endpoint when present) into the message for context.
       */
      message: context ? `[${this.code}] ${context} ${this.message}` : `[${this.code}] ${this.message}`,
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
      screen: this.screen,
      url: this.url,
      method: this.method,
      cause: summarizeCause(this.cause),
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
