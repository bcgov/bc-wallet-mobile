import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { appLogger } from '@/utils/logger'
import { BifoldError, useTheme } from '@bifold/core'
import React, { useCallback, useMemo } from 'react'
import { Modal, Pressable, StyleSheet } from 'react-native'
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
  message: string
  code: number
  appEvent: string
  cause?: unknown
  stack?: string
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
  error,
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
   * @returns void
   */
  const handleReport = useCallback(() => {
    if (!error) {
      return
    }

    Analytics.trackAlertActionEvent(error.appEvent as AppEventCode, ANALYTICS_REPORT_THIS_PROBLEM_LABEL)

    const reportError = new BifoldError(error.title, error.description, error.message, error.code)
    reportError.cause = error.cause
    reportError.stack = error.stack

    appLogger.report(reportError)
  }, [error])

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

  if (!error) {
    return null
  }

  return (
    <Modal visible={Boolean(error)} transparent animationType="fade" onRequestClose={onDismiss}>
      {/* Allow presses outside of the modal to dismiss it */}
      <Pressable onPress={onDismiss} style={overlayStyle.overlay} accessible={false} importantForAccessibility="no">
        {/* Prevent presses inside the modal from propagating to the overlay */}
        <Pressable onPress={(e) => e.stopPropagation()} accessible={false} importantForAccessibility="no">
          <ErrorInfoCard
            key={errorKey}
            title={error.title}
            description={error.description}
            message={error.message}
            code={error.code}
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
