import { extractErrorMessage } from '@/errors'
import { AppError } from '@/errors/appError'
import { logError, trackErrorInAnalytics } from '@/errors/errorHandler'
import { ErrorRegistry, ErrorRegistryKey } from '@/errors/errorRegistry'
import { AlertInteractionEvent, AppEventCode } from '@/events/appEventCode'
import { AlertAction, showAlert } from '@/utils/alert'
import { appLogger } from '@/utils/logger'
import { BifoldError, EventTypes } from '@bifold/core'
import i18next from 'i18next'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo } from 'react'
import { DeviceEventEmitter } from 'react-native'

export interface ErrorOptions {
  /** Original error for technical details */
  error?: unknown
  /** Override the default modal behavior */
  showModal?: boolean
  /** Additional context for logging */
  context?: Record<string, unknown>
}

export interface ErrorAlertOptions extends Omit<ErrorOptions, 'showModal'> {
  /** Custom actions/buttons for the native alert */
  actions?: AlertAction[]
}

export interface AlertOptions {
  /** Custom actions/buttons for the native alert */
  actions?: AlertAction[]
  /** Optional AlertEvent for analytics tracking */
  event?: AppEventCode
}

export interface ErrorAlertContextType {
  /**
   * Show error via ErrorModal (default display)
   */
  emitError: (key: ErrorRegistryKey, options?: ErrorOptions) => void

  /**
   * Show native alert with title and body
   */
  emitAlert: (title: string, body: string, options?: AlertOptions) => void

  /**
   * Show error as native alert from an AppError instance
   */
  emitErrorAlert: (error: AppError, options?: { actions?: AlertAction[] }) => void

  /**
   * Dismiss the currently displayed error modal
   */
  dismiss: () => void
}

export const ErrorAlertContext = createContext<ErrorAlertContextType | null>(null)

/**
 * ErrorAlertProvider - Unified error and alert handling for BC Wallet
 *
 * TODO (MD): Provide state to prevent multiple modals/alerts from stacking
 *
 * Provides a single entry point for:
 * - Error modals (via BifoldError/ErrorModal)
 * - Native alerts (via React Native Alert)
 * - Analytics tracking
 * - Error logging
 *
 */
export const ErrorAlertProvider = ({ children }: PropsWithChildren) => {
  /**
   * Show error via ErrorModal
   * Uses i18next.t() directly to avoid stale closure issues with useCallback
   *
   * TODO (MD): Rename to emitErrorModal to clarify usage
   */
  const emitError = useCallback((key: ErrorRegistryKey, options: ErrorOptions = {}): void => {
    const definition = ErrorRegistry[key]

    if (!definition) {
      appLogger.warn(`Unknown error key: ${key}`)
      emitError('GENERAL_ERROR', options)
      return
    }

    const { error: originalError, context } = options
    const technicalMessage = extractErrorMessage(originalError)

    logError(key, definition, technicalMessage, context)

    // Use i18next.t() directly to ensure translations are always current
    const title = i18next.t(definition.titleKey)
    const description = i18next.t(definition.descriptionKey)

    const bifoldError = new BifoldError(title, description, technicalMessage, definition.statusCode)
    trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)
    DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, bifoldError)
  }, [])

  /**
   * Show native alert with title and description
   */
  const emitAlert = useCallback((title: string, body: string, options?: AlertOptions): void => {
    showAlert(title, body, options?.actions, options?.event)
  }, [])

  /**
   * Show error as native alert from an AppError instance
   */
  const emitErrorAlert = useCallback((error: AppError, options?: { actions?: AlertAction[] }) => {
    showAlert(error.title, error.description, options?.actions, error.appEvent)
  }, [])

  /**
   * Dismiss the currently displayed error modal
   */
  const dismiss = useCallback((): void => {
    DeviceEventEmitter.emit(EventTypes.ERROR_REMOVED)
  }, [])

  const value: ErrorAlertContextType = useMemo(
    () => ({
      emitError,
      emitAlert,
      emitErrorAlert,
      dismiss,
    }),
    [emitError, emitAlert, emitErrorAlert, dismiss]
  )

  return <ErrorAlertContext.Provider value={value}>{children}</ErrorAlertContext.Provider>
}

/**
 * Hook to access error and alert functionality
 *
 * @returns Error alert context with methods: error, errorAsAlert, alert, dismiss
 * @throws Error if used outside of ErrorAlertProvider
 *
 */
export const useErrorAlert = (): ErrorAlertContextType => {
  const context = useContext(ErrorAlertContext)

  if (!context) {
    throw new Error('useErrorAlert must be used within an ErrorAlertProvider')
  }

  return context
}
