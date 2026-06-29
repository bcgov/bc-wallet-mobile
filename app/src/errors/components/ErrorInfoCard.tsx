import { PressableOpacity } from '@/components/PressableOpacity'
import { hitSlop } from '@/constants'
import { testIdWithKey } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { ErrorModalAction } from './ErrorModal'

// This component is used outside the theme provider in many cases and has style requirements
// that the current theme doesn't support well, so we define the colours here
export const colors = {
  cardBackground: '#FFFFFF',
  cardBorder: '#D3D3D3',
  shadow: '#000000',
  icon: '#313132',
  text: '#313132',
  textSecondary: '#606060',
  link: '#003366',
  primaryButton: '#003366',
  primaryButtonDisabled: '#757575',
  primaryButtonText: '#FFFFFF',
  primaryButtonTextDisabled: '#FFFFFF',
  successIcon: '#89CE00',
  secondaryButtonBackground: '#FFFFFF',
  secondaryButtonBorder: '#003366',
  secondaryButtonText: '#003366',
  destructiveButton: '#D8292F',
  destructiveButtonText: '#FFFFFF',
}

export interface ErrorInfoCardProps {
  title: string
  description: string
  message?: string
  code?: number
  onDismiss: () => void
  /**
   * Invoked when the user reports the problem. May return a reference code that
   * the card then surfaces for the user to share with support.
   */
  onReport?: () => string | void
  enableReport?: boolean
  action?: ErrorModalAction
}

export const ErrorInfoCard: React.FC<ErrorInfoCardProps> = ({
  title,
  description,
  message,
  code,
  onDismiss,
  onReport,
  action,
  enableReport = false,
}) => {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const [showDetails, setShowDetails] = useState(false)
  const [reported, setReported] = useState(false)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current)
      }
    }
  }, [])

  const formattedDetails = message ? `${t('Error.ErrorCode')} ${code ?? 0} - ${message}` : ''

  const handleReport = () => {
    setReported(true)
    const reportedCode = onReport?.()
    if (reportedCode) {
      setReferenceCode(reportedCode)
    }
  }

  const handleCopy = () => {
    if (!referenceCode) {
      return
    }
    Clipboard.setString(referenceCode)
    setCopied(true)
    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current)
    }
    copyResetTimeout.current = setTimeout(() => setCopied(false), 2000)
  }

  const containerStyle = useMemo(
    () => ({
      minWidth: width - 50,
      maxWidth: width - 50,
    }),
    [width]
  )

  return (
    <View style={containerStyle}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Icon name="error" size={30} color={colors.icon} style={styles.icon} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.titleText} testID={testIdWithKey('HeaderText')}>
              {title}
            </Text>
          </View>
          <PressableOpacity
            onPress={onDismiss}
            hitSlop={hitSlop}
            testID={testIdWithKey('CloseButton')}
            accessibilityLabel={t('Global.Close')}
            accessibilityRole="button"
          >
            <Icon name="close" size={24} color={colors.icon} />
          </PressableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.bodyText} testID={testIdWithKey('BodyText')}>
            {description}
          </Text>

          {message && (
            <TouchableOpacity
              accessibilityLabel={showDetails ? t('Global.HideDetails') : t('Global.ShowDetails')}
              accessibilityRole="button"
              accessibilityState={{ expanded: showDetails }}
              testID={testIdWithKey('ShowDetails')}
              style={styles.showDetailsTouchable}
              onPress={() => setShowDetails((prev) => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.showDetailsRow}>
                <Text style={styles.showDetailsText}>
                  {showDetails ? t('Global.HideDetails') : t('Global.ShowDetails')}{' '}
                </Text>
                <CommunityIcon name={showDetails ? 'chevron-up' : 'chevron-down'} size={30} color={colors.link} />
              </View>
            </TouchableOpacity>
          )}

          {message && showDetails && (
            <Text style={styles.detailsText} testID={testIdWithKey('DetailsText')}>
              {formattedDetails}
            </Text>
          )}

          <View style={styles.buttons}>
            {enableReport && onReport && (
              <TouchableOpacity
                accessibilityLabel={reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
                accessibilityRole="button"
                testID={testIdWithKey('ReportThisProblem')}
                style={[styles.primaryButton, reported && styles.primaryButtonDisabled]}
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

            {action && (
              <TouchableOpacity
                accessibilityLabel={action.text}
                accessibilityRole="button"
                testID={testIdWithKey('ActionButton')}
                style={action.style === 'destructive' ? styles.destructiveButton : styles.secondaryButton}
                onPress={() => {
                  onDismiss()
                  action.onPress()
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={action.style === 'destructive' ? styles.destructiveButtonText : styles.secondaryButtonText}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {reported && referenceCode && (
            <View style={styles.referenceContainer} testID={testIdWithKey('ReferenceCode')}>
              <Text style={styles.referenceLabel}>{t('Error.ReferenceCode')}</Text>
              <View style={styles.referenceRow}>
                <Text
                  style={styles.referenceCode}
                  selectable
                  accessibilityLabel={`${t('Error.ReferenceCode')}: ${referenceCode}`}
                  testID={testIdWithKey('ReferenceCodeValue')}
                >
                  {referenceCode}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={copied ? t('Error.CodeCopied') : t('Error.CopyCode')}
                  accessibilityRole="button"
                  testID={testIdWithKey('CopyReferenceCode')}
                  style={styles.copyButton}
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <CommunityIcon
                    name={copied ? 'check' : 'content-copy'}
                    size={18}
                    color={copied ? colors.successIcon : colors.link}
                  />
                  <Text style={styles.copyButtonText}>{copied ? t('Error.CodeCopied') : t('Error.CopyCode')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.referenceHint}>{t('Error.ShareCodeWithSupport')}</Text>
            </View>
          )}

          <Text style={styles.footer} testID={testIdWithKey('VersionNumber')}>
            {t('Settings.Version')} {getVersion()} ({getBuildNumber()})
          </Text>
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
    marginVertical: 8,
    lineHeight: 24,
  },
  detailsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  showDetailsTouchable: {
    marginVertical: 8,
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
    gap: 8,
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
  destructiveButton: {
    backgroundColor: colors.destructiveButton,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.destructiveButtonText,
  },
  referenceContainer: {
    marginTop: 16,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#F2F2F2',
  },
  referenceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referenceCode: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.text,
    flexShrink: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.link,
    marginLeft: 4,
  },
  referenceHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    alignSelf: 'center',
    fontSize: 12,
    color: colors.textSecondary,
  },
})
