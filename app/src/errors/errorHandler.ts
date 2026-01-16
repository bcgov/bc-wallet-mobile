import i18next from 'i18next'

import { AlertInteractionEvent } from '../events/appEventCode'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'

import { ErrorDefinition, ErrorRegistry, ErrorRegistryKey } from './errorRegistry'

/**
 * Extract a meaningful message from an unknown error value
 */
export function extractErrorMessage(error: unknown): string {
  if (error == null) {
    return ''
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  try {
    return JSON.stringify(error)
  } catch {
    // JSON.stringify failed (e.g., circular reference), return type info instead
    return `[Non-serializable ${typeof error}]`
  }
}

/**
 * Track error in Snowplow analytics
 */
export function trackErrorInAnalytics(definition: ErrorDefinition, interactionType: AlertInteractionEvent): void {
  // Track the error event
  Analytics.trackErrorEvent({
    code: String(definition.statusCode),
    message: definition.appEvent,
  })

  // Track the alert display event
  if (interactionType === AlertInteractionEvent.ALERT_DISPLAY) {
    Analytics.trackAlertDisplayEvent(definition.appEvent)
  }

  appLogger.debug(`Analytics: ${interactionType} - ${definition.appEvent}`, {
    code: definition.statusCode,
    category: definition.category,
    severity: definition.severity,
  })
}

/**
 * Get error definition by key (useful for custom error handling)
 */
export function getErrorDefinition(errorKey: ErrorRegistryKey): ErrorDefinition {
  return ErrorRegistry[errorKey]
}

/**
 * Log error details for debugging
 */
export function logError(
  errorKey: string,
  definition: ErrorDefinition,
  technicalMessage: string,
  context?: Record<string, unknown>
): void {
  const title = i18next.t(definition.titleKey)
  const description = i18next.t(definition.descriptionKey)

  appLogger.error(`[${errorKey}] ${title}: ${description}`, {
    code: definition.statusCode,
    category: definition.category,
    severity: definition.severity,
    technicalMessage,
    ...context,
  })
}
