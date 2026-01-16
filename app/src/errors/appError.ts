import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { RemoteLogger } from '@bifold/remote-logs'
import i18next from 'i18next'
import { ErrorCategory, ErrorDefinition } from './errorRegistry'

type ErrorIdentity = {
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
  code: string // ie: network.err_no_internet.2100
  title: string // ie: No Internet
  appEvent: AppEventCode // ie: no_internet
  description: string // ie: Please check your network connection and try again.
  timestamp: string // ISO timestamp of when the error was created

  private identity: ErrorIdentity // Structured identity of the error

  constructor(title: string, description: string, identity: ErrorIdentity, options?: ErrorOptions) {
    super(`${title}: ${description}`, options)
    this.name = this.constructor.name

    this.code = `${identity.category}.${identity.appEvent}.${identity.statusCode}` // ie: network.err_no_internet.2100
    this.title = title
    this.appEvent = identity.appEvent
    this.description = description
    this.identity = identity
    this.timestamp = new Date().toISOString()

    // On creation, automatically track the error in analytics
    Analytics.trackErrorEvent(this)
  }

  /**
   * Create an AppError from an ErrorDefinition, with translated title and description.
   *
   * @param definition - The ErrorDefinition to create the AppError from.
   * @param options - Optional ErrorOptions for additional context.
   * @returns An instance of AppError.
   */
  static fromErrorDefinition(definition: ErrorDefinition, options?: ErrorOptions): AppError {
    return new AppError(
      i18next.t(definition.titleKey),
      i18next.t(definition.descriptionKey),
      {
        category: definition.category,
        appEvent: definition.appEvent,
        statusCode: definition.statusCode,
      },
      options
    )
  }

  /**
   * Log the error details, including code, message, timestamp, and cause if available.
   *
   * @param logger - The RemoteLogger instance to use for logging.
   * @returns void
   */
  log(logger: RemoteLogger): void {
    logger.error(this.message, {
      code: this.code,
      timestamp: this.timestamp,
      cause: this.cause,
    })
  }
}
