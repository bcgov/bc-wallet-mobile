import { testIdWithKey } from '@bifold/core'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import Icon from 'react-native-vector-icons/MaterialIcons'

export interface ErrorInfoCardColors {
  cardBackground: string
  cardBorder: string
  shadow: string
  icon: string
  text: string
  textSecondary: string
  link: string
  primaryButton: string
  primaryButtonDisabled: string
  primaryButtonText: string
  primaryButtonTextDisabled: string
  successIcon: string
  secondaryButtonBackground: string
  secondaryButtonBorder: string
  secondaryButtonText: string
}

export const fallbackColors: ErrorInfoCardColors = {
  cardBackground: '#FFFFFF',
  cardBorder: '#D3D3D3',
  shadow: '#000000',
  icon: '#313132',
  text: '#313132',
  textSecondary: '#606060',
  link: '#FCBA19',
  primaryButton: '#FCBA19',
  primaryButtonDisabled: '#757575',
  primaryButtonText: '#01264C',
  primaryButtonTextDisabled: '#FFFFFF',
  successIcon: '#89CE00',
  secondaryButtonBackground: '#FFFFFF',
  secondaryButtonBorder: '#313132',
  secondaryButtonText: '#313132',
}

export interface ErrorInfoCardProps {
  title: string
  description: string
  message?: string
  code?: number
  onDismiss: () => void
  onReport?: () => void
  enableReport?: boolean
  colors?: ErrorInfoCardColors
}

export const ErrorInfoCard: React.FC<ErrorInfoCardProps> = ({
  title,
  description,
  message,
  code,
  onDismiss,
  onReport,
  enableReport = false,
  colors = fallbackColors,
}) => {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const [showDetails, setShowDetails] = useState(false)
  const [reported, setReported] = useState(false)

  const formattedDetails = message ? `${t('Error.ErrorCode')} ${code ?? 0} - ${message}` : ''
  const styles = useMemo(() => createCardStyles(width, colors), [width, colors])

  const handleReport = () => {
    setReported(true)
    onReport?.()
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Icon name="error" size={30} color={colors.icon} style={styles.icon} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.titleText} testID={testIdWithKey('HeaderText')}>
              {title}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.bodyText} testID={testIdWithKey('BodyText')}>
            {description}
          </Text>

          {message && showDetails && (
            <Text style={styles.detailsText} testID={testIdWithKey('DetailsText')}>
              {formattedDetails}
            </Text>
          )}

          {message && !showDetails && (
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
                <Icon name="chevron-right" size={30} color={colors.link} />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.buttons}>
            {enableReport && onReport && (
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
                    <Icon name="check-circle" size={18} color={colors.successIcon} style={styles.reportIcon} />
                  )}
                  <Text style={reported ? styles.primaryButtonTextDisabled : styles.primaryButtonText}>
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
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>{t('Global.Okay')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer} testID={testIdWithKey('VersionNumber')}>
            {t('Settings.Version')} {getVersion()} ({getBuildNumber()})
          </Text>
        </ScrollView>
      </View>
    </View>
  )
}

const createCardStyles = (width: number, colors: ErrorInfoCardColors) =>
  StyleSheet.create({
    container: {
      minWidth: width - 50,
      maxWidth: width - 50,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      shadowColor: colors.shadow,
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
      color: colors.text,
    },
    body: {
      marginTop: 8,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    bodyText: {
      fontSize: 16,
      color: colors.text,
      marginVertical: 12,
      lineHeight: 24,
    },
    detailsText: {
      fontSize: 14,
      color: colors.textSecondary,
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
      color: colors.link,
    },
    buttons: {
      paddingTop: 16,
      paddingHorizontal: 4,
    },
    reportButtonWrapper: {
      marginBottom: 12,
    },
    primaryButton: {
      backgroundColor: colors.primaryButton,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.primaryButtonDisabled,
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
      color: colors.primaryButtonText,
    },
    primaryButtonTextDisabled: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryButtonTextDisabled,
    },
    secondaryButton: {
      backgroundColor: colors.secondaryButtonBackground,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.secondaryButtonBorder,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.secondaryButtonText,
    },
    footer: {
      marginTop: 16,
      paddingTop: 8,
      alignSelf: 'center',
      fontSize: 12,
      color: colors.textSecondary,
    },
  })
