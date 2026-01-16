/**
 * BC Wallet Error Handling Module
 *
 * This module provides a centralized error handling framework that:
 * - Uses a registry of predefined errors with localized messages
 * - Integrates with the Bifold ErrorModal for user-facing error display
 * - Supports native alerts via ErrorAlertContext
 * - Supports Snowplow analytics tracking
 * - Provides remote logging via the app logger
 *
 * ## Recommended Usage (React Components)
 *
 * Use the `useErrorAlert()` hook for the cleanest API:
 *
 * ```typescript
 * import { useErrorAlert } from '@/contexts/ErrorAlertContext'
 *
 * const MyComponent = () => {
 *   const { emitError, emitErrorAlert, emitAlert, dismiss } = useErrorAlert()
 *
 *   // Show error via ErrorModal
 *   emitError('INVALID_QR_CODE', { error: err })
 *
 *   // Show error as native alert with custom buttons
 *   emitErrorAlert(new AppError(...), {
 *     actions: [{ text: 'Retry', onPress: retry }]
 *   })
 *
 *   // Show informational native alert
 *   emitAlert('Update available', 'A new version is ready', {
 *    actions: [{ text: 'Update Now', onPress: updateApp }],
 *    appEvent: 'APP_UPDATE_ALERT'
 *   })
 * }
 * ```
 */

// AppError class
export { AppError } from './appError'

// Error registry and types
export {
  ErrorCategory,
  ErrorRegistry,
  ErrorSeverity,
  type ErrorDefinition,
  type ErrorRegistryKey,
} from './errorRegistry'

// Error handler utilities
export { extractErrorMessage, getErrorDefinition, logError, trackErrorInAnalytics } from './errorHandler'
