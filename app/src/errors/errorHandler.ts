import i18next from 'i18next'
import { AlertInteractionEvent, AppEventCode } from '../events/appEventCode'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'
import { ErrorDefinition, ErrorRegistry, ErrorRegistryAppEventMap, ErrorRegistryKey } from './errorRegistry'

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
 *
 * @param definition - Error definition with statusCode and appEvent
 * @param interactionType - ALERT_DISPLAY when modal is shown, ALERT_ACTION when user takes action (e.g. Report)
 * @param actionLabel - Optional label for ALERT_ACTION (e.g. "Report this problem"). Defaults to i18n Error.ReportThisProblem.
 */
export function trackErrorInAnalytics(
  definition: ErrorDefinition,
  interactionType: AlertInteractionEvent,
  actionLabel?: string
): void {
  if (interactionType === AlertInteractionEvent.ALERT_DISPLAY) {
    // Track the error event once when the alert is first displayed (mobile_error schema)
    Analytics.trackErrorEvent({
      code: String(definition.statusCode),
      message: definition.appEvent,
    })
    Analytics.trackAlertDisplayEvent(definition.appEvent)
  }

  if (interactionType === AlertInteractionEvent.ALERT_ACTION) {
    Analytics.trackAlertActionEvent(definition.appEvent, actionLabel ?? i18next.t('Error.ReportThisProblem'))
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

/**
 * Get error definition from app event code
 *
 * @param appEvent - The application event code to look up.
 * @returns The corresponding ErrorDefinition or null if not found.
 */
export const getErrorDefinitionFromAppEventCode = (appEvent?: string): ErrorDefinition | null => {
  return ErrorRegistryAppEventMap.get(appEvent as AppEventCode) ?? null
}
