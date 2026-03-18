import { AppEventCode } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useTheme } from '@bifold/core'
import React, { useCallback, useMemo } from 'react'
import { Modal, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorInfoCard, ErrorInfoCardColors } from './ErrorInfoCard'

export interface ErrorModalPayload {
  title: string
  description: string
  message: string
  code: number
  appEvent: string
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
  const { ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleReport = useCallback(() => {
    if (!error) {
      return
    }

    Analytics.trackAlertActionEvent(error.appEvent as AppEventCode, 'Report this problem')

    logger.report({
      name: `UserReportedError[${error.appEvent}]`,
      title: error.title,
      description: error.description,
      message: error.message,
      code: error.code,
    })
  }, [error, logger])

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
