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
 * import { emitError } from '@/errors'
 *
 * try {
 *   await someOperation()
 * } catch (err) {
 *   emitError('NETWORK_ERROR', t, { error: err })
 * }
 * ```
 */

// Error registry and types
export {
  ErrorCategory,
  ErrorRegistry,
  ErrorSeverity,
  type ErrorDefinition,
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
