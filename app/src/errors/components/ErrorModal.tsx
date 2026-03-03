import { getErrorDefinitionFromAppEventCode, trackErrorInAnalytics } from '@/errors/errorHandler'
import { AlertInteractionEvent } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { EventTypes, useTheme } from '@bifold/core'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorInfoCard, ErrorInfoCardColors } from './ErrorInfoCard'

export interface ErrorModalPayload {
  title: string
  description: string
  message: string
  code: number
  appEvent?: string
}

const isErrorPayload = (payload: unknown): payload is ErrorModalPayload =>
  payload != null &&
  typeof payload === 'object' &&
  'title' in payload &&
  typeof (payload as ErrorModalPayload).title === 'string' &&
  'description' in payload &&
  typeof (payload as ErrorModalPayload).description === 'string'

/**
 * Normalizes an incoming event payload into a typed ErrorModalPayload.
 *
 * Accepts both plain-object payloads (emitted by ErrorAlertContext) and
 * BifoldError instances (emitted by legacy code paths like attestation.ts
 * and BCIDHelper.ts). BifoldError duck-types to this shape because it
 * exposes title, description, message, and code as own properties.
 */
const normalizePayload = (payload: unknown): ErrorModalPayload | null => {
  if (!isErrorPayload(payload)) {
    return null
  }
  return {
    title: payload.title,
    description: payload.description,
    message: payload.message ?? '',
    code: payload.code ?? 0,
    appEvent: payload.appEvent,
  }
}

const mapThemeToCardColors = (palette: ReturnType<typeof useTheme>['ColorPalette']): ErrorInfoCardColors => ({
  cardBackground: palette.grayscale.white,
  cardBorder: palette.grayscale.lightGrey,
  shadow: palette.grayscale.black,
  icon: palette.grayscale.darkGrey,
  text: palette.grayscale.darkGrey,
  textSecondary: palette.grayscale.mediumGrey,
  link: palette.brand.link,
  primaryButton: palette.brand.modalPrimary,
  primaryButtonDisabled: palette.brand.primaryDisabled,
  primaryButtonText: palette.brand.text,
  primaryButtonTextDisabled: palette.grayscale.white,
  successIcon: palette.semantic.success,
  secondaryButtonBackground: palette.grayscale.white,
  secondaryButtonBorder: palette.grayscale.darkGrey,
  secondaryButtonText: palette.grayscale.darkGrey,
})

interface BCSCErrorModalProps {
  enableReport?: boolean
}

/**
 * Custom error modal replacing Bifold's ErrorModal for full control
 * over styling and Snowplow analytics "Report" behavior.
 *
 * Listens for ERROR_ADDED / ERROR_REMOVED events and renders the shared
 * ErrorInfoCard inside a Modal overlay with theme colors.
 */
export const BCSCErrorModal: React.FC<BCSCErrorModalProps> = ({ enableReport = true }) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<ErrorModalPayload | null>(null)
  const [errorKey, setErrorKey] = useState(0)

  useEffect(() => {
    const addHandler = DeviceEventEmitter.addListener(EventTypes.ERROR_ADDED, (payload: unknown) => {
      const normalized = normalizePayload(payload)
      if (normalized) {
        setError(normalized)
        setErrorKey((prev) => prev + 1)
        setVisible(true)
      }
    })

    const removeHandler = DeviceEventEmitter.addListener(EventTypes.ERROR_REMOVED, () => {
      setError(null)
      setVisible(false)
    })

    return () => {
      addHandler.remove()
      removeHandler.remove()
    }
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    setError(null)
    DeviceEventEmitter.emit(EventTypes.ERROR_REMOVED)
  }, [])

  const handleReport = useCallback(() => {
    if (!error) {
      return
    }

    if (error.appEvent) {
      const definition = getErrorDefinitionFromAppEventCode(error.appEvent)
      if (definition) {
        trackErrorInAnalytics(definition, AlertInteractionEvent.ALERT_ACTION, t('Error.ReportThisProblem'))
      } else {
        Analytics.trackErrorEvent({ code: String(error.code), message: error.message })
      }
    } else {
      Analytics.trackErrorEvent({ code: String(error.code), message: error.message })
    }
  }, [error, t])

  const cardColors = useMemo(() => mapThemeToCardColors(ColorPalette), [ColorPalette])

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

  if (!visible || !error) {
    return null
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <SafeAreaView style={overlayStyle.overlay}>
        <ErrorInfoCard
          key={errorKey}
          title={error.title}
          description={error.description}
          message={error.message}
          code={error.code}
          onDismiss={handleDismiss}
          onReport={handleReport}
          enableReport={enableReport}
          colors={cardColors}
        />
      </SafeAreaView>
    </Modal>
  )
}
