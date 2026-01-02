import { BifoldError, EventTypes } from '@bifold/core'
import { TFunction } from 'i18next'
import { DeviceEventEmitter } from 'react-native'

import { AlertInteractionEvent } from '../events/alertEvents'
import { Analytics } from '../utils/analytics/analytics-singleton'
import { appLogger } from '../utils/logger'

import { BCWalletErrorDefinition, ErrorRegistry, ErrorRegistryKey } from './errorRegistry'

export interface EmitErrorOptions {
  /** Original error for technical details */
  error?: Error | unknown
  /** Override the default modal behavior */
  showModal?: boolean
  /** Additional context for logging */
  context?: Record<string, unknown>
}

/**
 * Emit a BC Wallet error using the error registry
 *
 * This function:
 * 1. Looks up the error definition from the registry
 * 2. Creates a localized BifoldError
 * 3. Emits the error event for ErrorModal to display
 * 4. Tracks the error in Snowplow analytics (when integrated)
 * 5. Logs the error for remote debugging
 *
 * @example
 * ```typescript
 * try {
 *   await scanQRCode()
 * } catch (err) {
 *   emitError('INVALID_QR_CODE', t, { error: err })
 * }
 * ```
 */
export function emitError(errorKey: ErrorRegistryKey, t: TFunction, options: EmitErrorOptions = {}): void {
  const definition = ErrorRegistry[errorKey]

  if (!definition) {
    appLogger.warn(`Unknown error key: ${errorKey}`)
    emitError('GENERAL_ERROR', t, options)
    return
  }

  const { error, showModal = (definition as BCWalletErrorDefinition).showModal ?? true, context } = options
  const technicalMessage = error instanceof Error ? error.message : String(error ?? '')

  // Create the bifold error
  const bifoldError = new BifoldError(
    t(definition.titleKey),
    t(definition.descriptionKey),
    technicalMessage,
    definition.code
  )

  // Log the error
  appLogger.error(`[${errorKey}] ${bifoldError.title}: ${bifoldError.description}`, {
    code: definition.code,
    category: definition.category,
    severity: definition.severity,
    technicalMessage,
    ...context,
  })

  // Track in Snowplow analytics
  trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)

  // Emit for ErrorModal (if enabled)
  if (showModal) {
    DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, bifoldError)
  }
}

/**
 * Emit a raw BifoldError directly (for backwards compatibility with bifold patterns)
 */
export function emitBifoldError(error: BifoldError): void {
  appLogger.error(`[BifoldError:${error.code}] ${error.title}: ${error.description}`)
  DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
}

/**
 * Dismiss the currently displayed error modal
 */
export function dismissError(): void {
  DeviceEventEmitter.emit(EventTypes.ERROR_REMOVED)
}

/**
 * Track error in Snowplow analytics
 */
function trackErrorInAnalytics(definition: BCWalletErrorDefinition, interactionType: AlertInteractionEvent): void {
  // Track the error event
  Analytics.trackErrorEvent({
    code: String(definition.code),
    message: definition.alertEvent,
  })

  // Track the alert display event
  if (interactionType === AlertInteractionEvent.ALERT_DISPLAY) {
    Analytics.trackAlertDisplayEvent(definition.alertEvent)
  }

  appLogger.debug(`Analytics: ${interactionType} - ${definition.alertEvent}`, {
    code: definition.code,
    category: definition.category,
    severity: definition.severity,
  })
}

/**
 * Track error action (user dismissed, tapped button, etc.)
 *
 * @param errorKey - The error registry key for the error being acted upon
 * @param actionLabel - The action label taken on the alert (e.g., 'dismiss', 'retry')
 */
export function trackErrorAction(errorKey: ErrorRegistryKey, actionLabel = 'dismiss'): void {
  const definition = ErrorRegistry[errorKey]
  if (!definition) {
    appLogger.warn(`Unknown error key for tracking: ${errorKey}`)
    return
  }

  Analytics.trackAlertActionEvent(definition.alertEvent, actionLabel)
  appLogger.debug(`Analytics: ${AlertInteractionEvent.ALERT_ACTION} - ${definition.alertEvent}`)
}

/**
 * Get error definition by key (useful for custom error handling)
 */
export function getErrorDefinition(errorKey: ErrorRegistryKey): BCWalletErrorDefinition {
  return ErrorRegistry[errorKey]
}
