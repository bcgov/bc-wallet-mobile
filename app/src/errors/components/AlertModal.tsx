import { AppEventCode } from '@/events/appEventCode'
import { AlertAction } from '@/utils/alert'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { reportProblem } from '@/utils/logger'
import { useTheme } from '@bifold/core'
import React, { useCallback, useMemo } from 'react'
import { Modal, Pressable, StyleSheet } from 'react-native'
import type { AppError } from '../appError'
import { AlertCard } from './AlertCard'
import { ErrorInfoCard, ErrorModalAction } from './ErrorInfoCard'

// Re-exported so the modal's payload types can be imported from one place
export type { ErrorModalAction }

const ANALYTICS_REPORT_THIS_PROBLEM_LABEL = 'Report this problem'

export interface ErrorModalPayload {
  title: string
  description: string
  error: AppError
  installId?: string // Optional install ID for error reporting
  buildHistory?: string // Optional formatted build history for error reporting
  sessionId?: number // Optional remote logging session ID
}

export interface AlertModalPayload {
  title: string
  description: string
  actions: AlertAction[]
  event?: AppEventCode
}

export type ModalPayload =
  | ({ kind: 'error'; action?: ErrorModalAction; enableReport: boolean } & ErrorModalPayload)
  | ({ kind: 'alert' } & AlertModalPayload)

export interface BCSCAlertModalProps {
  payload: ModalPayload | null
  errorKey: number
  onDismiss: () => void
}

/**
 * The app's one overlay modal, for both error modals and alerts, so only one popup can ever show.
 *
 * Rendered by ErrorAlertProvider and driven by its state — no event emitters or listeners involved.
 * An error closes on a tap outside or Android back. An alert never closes on a tap outside, since it
 * asks for a decision; Android back runs its 'cancel' action, and without one it needs a button press.
 */
export const BCSCAlertModal: React.FC<BCSCAlertModalProps> = ({ payload, errorKey, onDismiss }) => {
  const { ColorPalette } = useTheme()

  /**
   * Handler for "Report this problem" action in the error modal.
   * Tracks the event in analytics and sends a report to the logger (Loki Grafana) with error details.
   *
   * @returns the reference code the user can share with support, or undefined if there is no error
   */
  const handleReport = useCallback((): string | undefined => {
    if (payload?.kind !== 'error') {
      return
    }

    Analytics.trackAlertActionEvent(payload.error.appEvent as AppEventCode, ANALYTICS_REPORT_THIS_PROBLEM_LABEL)

    return reportProblem({
      title: payload.title,
      description: payload.description,
      code: payload.error.statusCode,
      error: payload.error,
      installId: payload.installId,
      buildHistory: payload.buildHistory,
      sessionId: payload.sessionId,
    })
  }, [payload])

  const handleAlertAction = useCallback(
    (action: AlertAction) => {
      onDismiss()
      action.onPress?.()
      if (payload?.kind === 'alert' && payload.event) {
        Analytics.trackAlertActionEvent(payload.event, action.text)
      }
    },
    [onDismiss, payload]
  )

  const handleRequestClose = useCallback(() => {
    if (payload?.kind === 'error') {
      onDismiss()
      return
    }

    const cancelAction = payload?.actions.find((action) => action.style === 'cancel')
    if (cancelAction) {
      handleAlertAction(cancelAction)
    }
  }, [handleAlertAction, onDismiss, payload])

  // Tapping outside closes an error, never an alert: an alert asks for a decision, so it needs a button
  const handleOverlayPress = useCallback(() => {
    if (payload?.kind === 'error') {
      onDismiss()
    }
  }, [onDismiss, payload])

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
    <Modal visible transparent animationType="fade" onRequestClose={handleRequestClose}>
      {/* Presses outside of the card close an error (see handleOverlayPress) */}
      <Pressable
        onPress={handleOverlayPress}
        style={overlayStyle.overlay}
        accessible={false}
        importantForAccessibility="no"
      >
        {/* Prevent presses inside the modal from propagating to the overlay */}
        <Pressable onPress={(e) => e.stopPropagation()} accessible={false} importantForAccessibility="no">
          {payload.kind === 'error' ? (
            <ErrorInfoCard
              key={errorKey}
              title={payload.title}
              description={payload.description}
              message={payload.error.fullMessage}
              code={payload.error.statusCode}
              onDismiss={onDismiss}
              onReport={handleReport}
              action={payload.action}
              enableReport={payload.enableReport}
            />
          ) : (
            <AlertCard
              title={payload.title}
              description={payload.description}
              actions={payload.actions}
              onAction={handleAlertAction}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
