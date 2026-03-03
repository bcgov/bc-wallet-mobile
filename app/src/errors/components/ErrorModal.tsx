import { getErrorDefinitionFromAppEventCode, trackErrorInAnalytics } from '@/errors/errorHandler'
import { AlertInteractionEvent } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { useTheme } from '@bifold/core'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorInfoCard, ErrorInfoCardColors } from './ErrorInfoCard'

export interface ErrorModalPayload {
  title: string
  description: string
  message: string
  code: number
  appEvent?: string
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

export interface BCSCErrorModalProps {
  error: ErrorModalPayload | null
  visible: boolean
  errorKey: number
  onDismiss: () => void
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
  visible,
  errorKey,
  onDismiss,
  enableReport = true,
}) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <SafeAreaView style={overlayStyle.overlay}>
        <ErrorInfoCard
          key={errorKey}
          title={error.title}
          description={error.description}
          message={error.message}
          code={error.code}
          onDismiss={onDismiss}
          onReport={handleReport}
          enableReport={enableReport}
          colors={cardColors}
        />
      </SafeAreaView>
    </Modal>
  )
}
