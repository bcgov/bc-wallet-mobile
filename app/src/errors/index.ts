/**
 * BC Wallet Error Handling Module
 *
 * This module provides a centralized error handling framework that:
 * - Uses a registry of predefined errors with technical messages
 * - Integrates with the ErrorModal for user-facing error display
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
 *   const { emitErrorModal, emitAlert } = useErrorAlert()
 *
 *   // Show error via ErrorModal
 *   emitErrorModal('Error Title', 'Something went wrong', appErrorInstance)
 *
 *   // Show informational native alert
 *   emitAlert('Update available', 'A new version is ready', {
 *    actions: [{ text: 'Update Now', onPress: updateApp }],
 *    appEvent: AppEventCode.UPDATE_APP_EVENT
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
export { extractErrorMessage, getErrorDefinition } from './errorHandler'
