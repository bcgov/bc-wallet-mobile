import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { BifoldError } from '@bifold/core'
import i18next from 'i18next'
import { ErrorCategory, ErrorDefinition } from './errorRegistry'

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
  private readonly identity: ErrorIdentity

  code: string // ie: network.err_no_internet.2100
  title: string // ie: No Internet
  appEvent: AppEventCode // ie: no_internet
  description: string // ie: Please check your network connection and try again.
  timestamp: string // ISO timestamp of when the error was created

  constructor(title: string, description: string, identity: ErrorIdentity, options?: ErrorOptions) {
    super(`${title}: ${description}`, options)
    this.name = this.constructor.name

    this.identity = identity

    this.code = `${identity.category}.${identity.appEvent}.${identity.statusCode}` // ie: network.err_no_internet.2100
    this.title = title
    this.appEvent = identity.appEvent
    this.description = description
    this.timestamp = new Date().toISOString()

    // On creation, automatically track the error in analytics
    Analytics.trackErrorEvent(this)
  }

  /**
   * Get the technical message from the original error, if available.
   *
   * @returns The technical message or null if not available.
   */
  get technicalMessage(): string | null {
    return this.cause instanceof Error ? this.cause.message : null
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
      i18next.t(definition.titleKey) ?? definition.titleKey,
      i18next.t(definition.descriptionKey) ?? definition.descriptionKey,
      {
        category: definition.category,
        appEvent: definition.appEvent,
        statusCode: definition.statusCode,
      },
      options
    )
  }

  /**
   * Convert the AppError to a BifoldError instance.
   *
   * @returns A BifoldError representing the AppError.
   */
  toBifoldError(): BifoldError {
    return new BifoldError(
      this.title,
      this.description,
      this.technicalMessage ?? this.message,
      this.identity.statusCode
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
      cause: this.cause,
    }
  }
}
