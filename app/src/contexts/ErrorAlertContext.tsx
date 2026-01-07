import { extractErrorMessage } from '@/errors'
import { logError, trackErrorInAnalytics } from '@/errors/errorHandler'
import { ErrorDefinition, ErrorRegistry, ErrorRegistryKey } from '@/errors/errorRegistry'
import { AlertEvent, AlertInteractionEvent } from '@/events/alertEvents'
import { showNativeAlert } from '@/utils/alert'
import { appLogger } from '@/utils/logger'
import { BifoldError, EventTypes } from '@bifold/core'
import { createContext, PropsWithChildren, useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertButton, DeviceEventEmitter } from 'react-native'

type AlertAction = AlertButton & { text: string }

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

export interface ErrorAlertContextType {
  /**
   * Show error via ErrorModal (default display)
   */
  error: (key: ErrorRegistryKey, options?: ErrorOptions) => void

  /**
   * Show error as native alert instead of ErrorModal
   */
  errorAsAlert: (key: ErrorRegistryKey, options?: ErrorAlertOptions) => void

  /**
   * Show native alert by AlertEvent
   */
  alert: (event: AlertEvent, actions?: AlertAction[]) => void

  /**
   * Dismiss the currently displayed error modal
   */
  dismiss: () => void
}

export const ErrorAlertContext = createContext<ErrorAlertContextType | null>(null)

/**
 * ErrorAlertProvider - Unified error and alert handling for BC Wallet
 *
 * Provides a single entry point for:
 * - Error modals (via BifoldError/ErrorModal)
 * - Native alerts (via React Native Alert)
 * - Analytics tracking
 * - Error logging
 *
 */
export const ErrorAlertProvider = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()

  /**
   * Show error via ErrorModal
   */
  const error = useCallback(
    (key: ErrorRegistryKey, options: ErrorOptions = {}): void => {
      const definition = ErrorRegistry[key]

      if (!definition) {
        appLogger.warn(`Unknown error key: ${key}`)
        error('GENERAL_ERROR', options)
        return
      }

      const { error: originalError, showModal = (definition as ErrorDefinition).showModal ?? true, context } = options
      const technicalMessage = extractErrorMessage(originalError)

      logError(key, definition, technicalMessage, context)

      if (showModal) {
        const bifoldError = new BifoldError(
          t(definition.titleKey),
          t(definition.descriptionKey),
          technicalMessage,
          definition.code
        )
        trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, bifoldError)
      }
    },
    [t]
  )

  /**
   * Show error as native alert
   */
  const errorAsAlert = useCallback((key: ErrorRegistryKey, options: ErrorAlertOptions = {}): void => {
    const definition = ErrorRegistry[key]

    if (!definition) {
      appLogger.warn(`Unknown error key: ${key}`)
      errorAsAlert('GENERAL_ERROR', options)
      return
    }

    const { error: originalError, actions, context } = options
    const technicalMessage = extractErrorMessage(originalError)

    logError(key, definition, technicalMessage, context)
    trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_DISPLAY)

    showNativeAlert(definition.alertEvent, actions)
  }, [])

  /**
   * Show native alert by AlertEvent
   */
  const alert = useCallback((event: AlertEvent, actions?: AlertAction[]): void => {
    showNativeAlert(event, actions)
  }, [])

  /**
   * Dismiss the currently displayed error modal
   */
  const dismiss = useCallback((): void => {
    DeviceEventEmitter.emit(EventTypes.ERROR_REMOVED)
  }, [])

  const value: ErrorAlertContextType = {
    error,
    errorAsAlert,
    alert,
    dismiss,
  }

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
