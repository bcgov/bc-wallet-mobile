import { AppError } from '@/errors'
import { BCSCErrorModal, ErrorModalPayload } from '@/errors/components/ErrorModal'
import { AppEventCode } from '@/events/appEventCode'
import { AlertAction, showAlert } from '@/utils/alert'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { appLogger } from '@/utils/logger'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'

export interface ErrorModalAction {
  text: string
  onPress: () => void
  style?: 'default' | 'destructive' | undefined
}

interface ErrorModalOptions {
  action?: ErrorModalAction
  // dismissible?: boolean TODO (MD): Future enhancement to make error modals blocking/non-dismissible
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
  emitErrorModal: (title: string, description: string, error: AppError, options?: ErrorModalOptions) => void

  /**
   * Show native alert with title and description
   */
  emitAlert: (title: string, description: string, options?: AlertOptions) => void
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
  const [errorModalOptions, setErrorModalOptions] = useState<ErrorModalOptions | null>(null)

  /**
   * Show error via ErrorModal
   *
   * @param title - The title to display in the error modal
   * @param description - The description/message to display in the error modal
   * @param error - The AppError instance containing error details and analytics info
   * @returns void
   */
  const emitErrorModal = useCallback(
    (title: string, description: string, error: AppError, options?: ErrorModalOptions): void => {
      if (options) {
        setErrorModalOptions(options)
      }

      // Track alert display and error events in analytics
      Analytics.trackAlertDisplayEvent(error.appEvent)
      error.track()

      appLogger.error(`[${error.code}] Error modal emitted`, {
        title,
        description,
        ...error.toJSON(),
      })

      setError({
        title,
        description,
        message: error.fullMessage,
        code: error.statusCode,
        appEvent: error.appEvent,
        stack: error.stack,
        cause: error.cause,
      })
      setErrorKey((prev) => prev + 1)
    },
    []
  )

  /**
   * Show native alert with title and description
   */
  const emitAlert = useCallback((title: string, description: string, options?: AlertOptions): void => {
    showAlert(title, description, options?.actions, options?.event)
  }, [])

  /**
   * Dismiss the currently displayed error modal
   */
  const dismissErrorModal = useCallback((): void => {
    setError(null)
    setErrorModalOptions(null)
  }, [])

  const value: ErrorAlertContextType = useMemo(
    () => ({
      emitErrorModal,
      emitAlert,
    }),
    [emitErrorModal, emitAlert]
  )

  return (
    <ErrorAlertContext.Provider value={value}>
      {children}
      <BCSCErrorModal
        error={error}
        errorKey={errorKey}
        onDismiss={dismissErrorModal}
        enableReport={enableReport}
        action={errorModalOptions?.action}
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
