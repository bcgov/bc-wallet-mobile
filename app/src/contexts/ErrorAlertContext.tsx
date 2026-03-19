import { extractErrorMessage } from '@/errors'
import { BCSCErrorModal, ErrorModalPayload } from '@/errors/components/ErrorModal'
import { logError } from '@/errors/errorHandler'
import { ErrorRegistry, ErrorRegistryKey } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { AlertAction, showAlert } from '@/utils/alert'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { appLogger } from '@/utils/logger'
import i18next from 'i18next'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'

export interface ErrorOptions {
  /** Original error for technical details */
  error?: unknown
  /** Additional context for logging */
  context?: Record<string, unknown>
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
  emitErrorModal: (key: ErrorRegistryKey, options?: ErrorOptions) => void

  /**
   * Show native alert with title and body
   */
  emitAlert: (title: string, body: string, options?: AlertOptions) => void

  /**
   * Dismiss the currently displayed error modal
   */
  dismiss: () => void
}

export const ErrorAlertContext = createContext<ErrorAlertContextType | null>(null)

interface ErrorAlertProviderProps extends PropsWithChildren {
  enableReport?: boolean
}

/**
 * ErrorAlertProvider - Unified error and alert handling for BC Wallet
 *
 * Owns the error modal state and renders BCSCErrorModal directly,
 * eliminating the DeviceEventEmitter indirection.
 *
 * Provides a single entry point for:
 * - Error modals (via BCSCErrorModal, rendered internally)
 * - Native alerts (via React Native Alert)
 * - Analytics tracking
 * - Error logging
 *
 */
export const ErrorAlertProvider = ({ children, enableReport = true }: ErrorAlertProviderProps) => {
  const [error, setError] = useState<ErrorModalPayload | null>(null)
  const [errorKey, setErrorKey] = useState(0)

  // TODO (MD): Add a specific error emitter function for AppError's ie: emitAppErrorModal. Deprecate emitErrorModal

  /**
   * Show error via ErrorModal
   * Uses i18next.t() directly to avoid stale closure issues with useCallback
   */
  const emitErrorModal = useCallback((key: ErrorRegistryKey, options: ErrorOptions = {}): void => {
    const definition = ErrorRegistry[key]

    if (!definition) {
      appLogger.warn(`Unknown error key: ${key}`)
      emitErrorModal('GENERAL_ERROR', options)
      return
    }

    const { error: originalError, context } = options
    const technicalMessage = extractErrorMessage(originalError)

    logError(key, definition, technicalMessage, context)

    const title = i18next.t(definition.titleKey)
    const description = i18next.t(definition.descriptionKey)

    // Track alert display and error events in analytics
    Analytics.trackAlertDisplayEvent(definition.appEvent)
    Analytics.trackErrorEvent({ code: definition.appEvent, message: technicalMessage })

    setError({
      title,
      description,
      message: technicalMessage,
      code: definition.statusCode,
      appEvent: definition.appEvent,
      stack: originalError instanceof Error ? originalError.stack : undefined,
      cause: originalError instanceof Error ? originalError.cause : undefined,
    })
    setErrorKey((prev) => prev + 1)
  }, [])

  /**
   * Show native alert with title and description
   */
  const emitAlert = useCallback((title: string, body: string, options?: AlertOptions): void => {
    showAlert(title, body, options?.actions, options?.event)
  }, [])

  /**
   * Dismiss the currently displayed error modal
   */
  const dismiss = useCallback((): void => {
    setError(null)
  }, [])

  const value: ErrorAlertContextType = useMemo(
    () => ({
      emitErrorModal,
      emitAlert,
      dismiss,
    }),
    [emitErrorModal, emitAlert, dismiss]
  )

  return (
    <ErrorAlertContext.Provider value={value}>
      {children}
      <BCSCErrorModal
        error={error}
        visible={Boolean(error)}
        errorKey={errorKey}
        onDismiss={dismiss}
        enableReport={enableReport}
      />
    </ErrorAlertContext.Provider>
  )
}

/**
 * Hook to access error and alert functionality
 *
 * @returns Error alert context with methods: emitErrorModal, emitAlert, dismiss
 * @throws Error if used outside of ErrorAlertProvider
 */
export const useErrorAlert = (): ErrorAlertContextType => {
  const context = useContext(ErrorAlertContext)

  if (!context) {
    throw new Error('useErrorAlert must be used within an ErrorAlertProvider')
  }

  return context
}
