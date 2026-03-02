import { getErrorDefinitionFromAppEventCode, trackErrorInAnalytics } from '@/errors/errorHandler'
import { AlertInteractionEvent } from '@/events/appEventCode'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { EventTypes, testIdWithKey, useTheme } from '@bifold/core'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeviceEventEmitter,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

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
  const p = payload as ErrorModalPayload
  return {
    title: p.title,
    description: p.description,
    message: p.message ?? '',
    code: p.code ?? 0,
    appEvent: p.appEvent,
  }
}

interface BCSCErrorModalProps {
  enableReport?: boolean
}

/**
 * Custom error modal replacing Bifold's ErrorModal for full control
 * over styling and Snowplow analytics "Report" behavior.
 */
export const BCSCErrorModal: React.FC<BCSCErrorModalProps> = ({ enableReport = true }) => {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const { ColorPalette } = useTheme()
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<ErrorModalPayload | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    const addHandler = DeviceEventEmitter.addListener(EventTypes.ERROR_ADDED, (payload: unknown) => {
      const normalized = normalizePayload(payload)
      if (normalized) {
        setError(normalized)
        setShowDetails(false)
        setReported(false)
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

    setReported(true)
  }, [error, t])

  const formattedDetails = error ? `${t('Error.ErrorCode')} ${error.code} - ${error.message}` : ''

  const styles = useMemo(() => createStyles(width, ColorPalette), [width, ColorPalette])

  if (!visible || !error) {
    return null
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Icon name="error" size={30} color={ColorPalette.grayscale.darkGrey} style={styles.icon} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.titleText} testID={testIdWithKey('HeaderText')}>
                  {error.title}
                </Text>
              </View>
            </View>

            {/* Scrollable body */}
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.bodyText} testID={testIdWithKey('BodyText')}>
                {error.description}
              </Text>

              {error.message && showDetails && (
                <Text style={styles.detailsText} testID={testIdWithKey('DetailsText')}>
                  {formattedDetails}
                </Text>
              )}

              {error.message && !showDetails && (
                <TouchableOpacity
                  accessibilityLabel={t('Global.ShowDetails')}
                  accessibilityRole="button"
                  testID={testIdWithKey('ShowDetails')}
                  style={styles.showDetailsTouchable}
                  onPress={() => setShowDetails(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.showDetailsRow}>
                    <Text style={styles.showDetailsText}>{t('Global.ShowDetails')} </Text>
                    <Icon name="chevron-right" size={30} color={ColorPalette.brand.link} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Buttons */}
              <View style={styles.buttons}>
                {enableReport && (
                  <TouchableOpacity
                    accessibilityLabel={reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
                    accessibilityRole="button"
                    testID={testIdWithKey('ReportThisProblem')}
                    style={[styles.primaryButton, reported && styles.primaryButtonDisabled, styles.reportButtonWrapper]}
                    onPress={handleReport}
                    disabled={reported}
                    activeOpacity={0.8}
                  >
                    <View style={styles.primaryButtonContent}>
                      {reported && (
                        <Icon
                          name="check-circle"
                          size={18}
                          color={ColorPalette.semantic.success}
                          style={styles.reportIcon}
                        />
                      )}
                      <Text style={styles.primaryButtonText}>
                        {reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  accessibilityLabel={t('Global.Okay')}
                  accessibilityRole="button"
                  testID={testIdWithKey('Okay')}
                  style={styles.secondaryButton}
                  onPress={handleDismiss}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>{t('Global.Okay')}</Text>
                </TouchableOpacity>
              </View>

              {/* Version footer */}
              <Text style={styles.footer} testID={testIdWithKey('VersionNumber')}>
                {t('Settings.Version')} {getVersion()} ({getBuildNumber()})
              </Text>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (width: number, colors: ReturnType<typeof useTheme>['ColorPalette']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.notification.popupOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      minWidth: width - 50,
      maxWidth: width - 50,
    },
    card: {
      backgroundColor: colors.grayscale.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.grayscale.lightGrey,
      padding: 16,
      shadowColor: colors.grayscale.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      flexDirection: 'row',
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    icon: {
      marginRight: 10,
      alignSelf: 'center',
    },
    headerTextContainer: {
      flex: 1,
      alignSelf: 'center',
    },
    titleText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.grayscale.darkGrey,
    },
    body: {
      marginTop: 8,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    bodyText: {
      fontSize: 16,
      color: colors.grayscale.darkGrey,
      marginVertical: 12,
      lineHeight: 24,
    },
    detailsText: {
      fontSize: 14,
      color: colors.grayscale.mediumGrey,
      marginTop: 8,
      marginBottom: 4,
      lineHeight: 20,
    },
    showDetailsTouchable: {
      marginVertical: 14,
    },
    showDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    showDetailsText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.brand.link,
    },
    buttons: {
      paddingTop: 16,
      paddingHorizontal: 4,
    },
    reportButtonWrapper: {
      marginBottom: 12,
    },
    primaryButton: {
      backgroundColor: colors.brand.modalPrimary,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.brand.primaryDisabled,
    },
    primaryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportIcon: {
      marginRight: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.brand.text,
    },
    secondaryButton: {
      backgroundColor: colors.brand.modalSecondaryBackground,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.brand.modalSecondaryBackground,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.grayscale.white,
    },
    footer: {
      marginTop: 16,
      paddingTop: 8,
      alignSelf: 'center',
      fontSize: 12,
      color: colors.grayscale.mediumGrey,
    },
  })
