import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { reportProblem } from '@/utils/logger'
import { useTheme } from '@bifold/core'
import React, { useCallback, useMemo } from 'react'
import { Modal, Pressable, StyleSheet } from 'react-native'
import { AppError } from '../appError'
import { ErrorInfoCard } from './ErrorInfoCard'

const ANALYTICS_REPORT_THIS_PROBLEM_LABEL = 'Report this problem'

export interface ErrorModalAction {
  text: string
  onPress: () => void
  style?: 'default' | 'destructive'
}

export interface ErrorModalPayload {
  title: string
  description: string
  appError: AppError
  // message: string
  // code: number
  // appEvent: string
  // cause?: unknown
  // stack?: string
  // screen?: string
  // url?: string
  // method?: string
  reportUUID?: string
}

export interface BCSCErrorModalProps {
  error: ErrorModalPayload | null
  errorKey: number
  onDismiss: () => void
  action?: ErrorModalAction
  enableReport?: boolean
}

/**
 * Custom error modal replacing Bifold's ErrorModal for full control
 * over styling and Snowplow analytics "Report" behavior.
 *
 * Rendered by ErrorAlertProvider and driven by its state — no event
 * emitters or listeners involved.
 */
export const BCSCErrorModal: React.FC<BCSCErrorModalProps> = ({
  error: payload,
  errorKey,
  onDismiss,
  action,
  enableReport = true,
}) => {
  const { ColorPalette } = useTheme()

  /**
   * Handler for "Report this problem" action in the error modal.
   * Tracks the event in analytics and sends a report to the logger (Loki Grafana) with error details.
   *
   * @returns the reference code the user can share with support, or undefined if there is no error
   */
  const handleReport = useCallback((): string | undefined => {
    if (!payload) {
      return
    }

    const error = payload.appError

    Analytics.trackAlertActionEvent(error.appEvent as AppEventCode, ANALYTICS_REPORT_THIS_PROBLEM_LABEL)

    // // error.message is AppError.fullMessage — the user-facing details string, which
    // // deliberately omits the screen name and request URL so we don't surface infra
    // // details to the user. Append them here so they still ride along in the Loki report.
    // let reportMessage = error.message
    // if (error.screen) {
    //   reportMessage += `\nScreen: ${error.screen}`
    // }
    // if (error.url) {
    //   const request = error.method ? `${error.method} ${error.url}` : error.url
    //   reportMessage += `\nRequest: ${request}`
    // }
    // if (payload.reportUUID) {
    //   reportMessage += `\nReport ID: ${error.reportUUID}`
    // }
    //
    // const reportError = new BifoldError(error.title, error.description, reportMessage, error.code)
    // reportError.cause = error.cause
    // reportError.stack = error.stack

    return reportProblem({ title: payload.title, description: payload.description, error: error })
  }, [payload])

  const overlayStyle = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: ColorPalette.notification.popupOverlay,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [ColorPalette]
  )

  if (!payload) {
    return null
  }

  return (
    <Modal visible={Boolean(payload)} transparent animationType="fade" onRequestClose={onDismiss}>
      {/* Allow presses outside of the modal to dismiss it */}
      <Pressable onPress={onDismiss} style={overlayStyle.overlay} accessible={false} importantForAccessibility="no">
        {/* Prevent presses inside the modal from propagating to the overlay */}
        <Pressable onPress={(e) => e.stopPropagation()} accessible={false} importantForAccessibility="no">
          <ErrorInfoCard
            key={errorKey}
            title={payload.title}
            description={payload.description}
            message={formatAppErrorDetails(payload.appError)}
            code={payload.appError.statusCode}
            onDismiss={onDismiss}
            onReport={handleReport}
            action={action}
            enableReport={enableReport}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function formatAppErrorDetails(error: AppError): string {
  const errorDetails = Object.entries(error.toJSON())

  return errorDetails.map(([key, value]) => `${key}: ${value}`).join('\n')
}
