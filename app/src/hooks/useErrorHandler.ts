import { BifoldError } from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
  dismissError,
  emitBifoldError,
  emitError,
  EmitErrorOptions,
  getErrorDefinition,
  trackErrorAction,
} from '../errors/errorHandler'
import { ErrorRegistryKey } from '../errors/errorRegistry'

/**
 * Hook for simplified error handling in components
 *
 * @example
 * ```typescript
 * const { handleError, clearError } = useErrorHandler()
 *
 * const onScan = async () => {
 *   try {
 *     await scanQRCode()
 *   } catch (err) {
 *     handleError('INVALID_QR_CODE', { error: err })
 *   }
 * }
 * ```
 */
export function useErrorHandler() {
  const { t } = useTranslation()

  /**
   * Handle an error using the error registry
   *
   * @param errorKey - Key from ErrorRegistry
   * @param options - Optional error details and configuration
   */
  const handleError = useCallback(
    (errorKey: ErrorRegistryKey, options?: EmitErrorOptions) => {
      emitError(errorKey, t, options)
    },
    [t]
  )

  /**
   * Handle a raw BifoldError (for compatibility with Bifold patterns)
   *
   * @param error - BifoldError instance
   */
  const handleBifoldError = useCallback((error: BifoldError) => {
    emitBifoldError(error)
  }, [])

  /**
   * Clear/dismiss the currently displayed error modal
   */
  const clearError = useCallback(() => {
    dismissError()
  }, [])

  /**
   * Track when a user interacts with an error (e.g., dismisses it)
   *
   * @param errorKey - The error key being acted upon
   */
  const trackAction = useCallback((errorKey: ErrorRegistryKey) => {
    trackErrorAction(errorKey)
  }, [])

  /**
   * Get the error definition for a given key (useful for custom UI)
   *
   * @param errorKey - Key from ErrorRegistry
   */
  const getDefinition = useCallback((errorKey: ErrorRegistryKey) => {
    return getErrorDefinition(errorKey)
  }, [])

  return {
    handleError,
    handleBifoldError,
    clearError,
    trackAction,
    getDefinition,
  }
}
