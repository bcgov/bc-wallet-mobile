/**
 * BC Wallet Error Handling Module
 *
 * This module provides a centralized error handling framework that:
 * - Uses a registry of predefined errors with localized messages
 * - Integrates with the Bifold ErrorModal for user-facing error display
 * - Supports Snowplow analytics tracking (when integrated)
 * - Provides remote logging via the app logger
 *
 * @example
 * ```typescript
 * // In a component
 * import { useErrorHandler } from '@/hooks/useErrorHandler'
 *
 * const { handleError } = useErrorHandler()
 *
 * try {
 *   await someOperation()
 * } catch (err) {
 *   handleError('NETWORK_ERROR', { error: err })
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Outside React components
 * import { emitError } from '@/errors'
 *
 * emitError('INVALID_QR_CODE', t, { error: err })
 * ```
 */

// Error registry and types
export {
  ErrorCategory,
  ErrorRegistry,
  ErrorSeverity,
  type BCWalletErrorDefinition,
  type ErrorRegistryKey,
} from './errorRegistry'

// Error handler utilities
export {
  dismissError,
  emitBifoldError,
  emitError,
  getErrorDefinition,
  trackErrorAction,
  type EmitErrorOptions,
} from './errorHandler'
