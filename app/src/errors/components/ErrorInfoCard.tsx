import { PressableOpacity } from '@/components/PressableOpacity'
import { CONTACT_US_HELP_URL, hitSlop } from '@/constants'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { colors, MAX_CARD_HEIGHT_RATIO, ModalCard, modalCardStyles } from './ModalCard'

// Re-exported so existing imports of the card's colours and height ratio keep working
export { colors, MAX_CARD_HEIGHT_RATIO }

export interface ErrorModalAction {
  text: string
  onPress: () => void
  style?: 'default' | 'destructive'
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

  return (
    <ModalCard
      title={title}
      titleTestID={testIdWithKey(TestIds.errorModal.title)}
      icon={<Icon name="error" size={30} color={colors.errorIcon} style={modalCardStyles.icon} />}
      headerRight={
        <PressableOpacity
          onPress={onDismiss}
          hitSlop={hitSlop}
          testID={testIdWithKey(TestIds.errorModal.close)}
          accessibilityLabel={t('Global.Close')}
          accessibilityRole="button"
        >
          <Icon name="close" size={24} color={colors.icon} />
        </PressableOpacity>
      }
    >
      <Text style={modalCardStyles.bodyText} testID={testIdWithKey(TestIds.errorModal.body)}>
        {description}
      </Text>

      {message && (
        <TouchableOpacity
          accessibilityLabel={showDetails ? t('Global.HideDetails') : t('Global.ShowDetails')}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          testID={testIdWithKey(TestIds.errorModal.showDetails)}
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
        <Text style={styles.detailsText} testID={testIdWithKey(TestIds.errorModal.details)}>
          {formattedDetails}
        </Text>
      )}

      <View style={modalCardStyles.buttons}>
        {enableReport && onReport && (
          <TouchableOpacity
            accessibilityLabel={reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
            accessibilityRole="button"
            testID={testIdWithKey(TestIds.errorModal.reportThisProblem)}
            style={[modalCardStyles.primaryButton, reported && styles.primaryButtonDisabled]}
            onPress={handleReport}
            disabled={reported}
            activeOpacity={0.8}
          >
            <View style={styles.primaryButtonContent}>
              {reported && <Icon name="check-circle" size={18} color={colors.successIcon} style={styles.reportIcon} />}
              <Text style={reported ? styles.primaryButtonTextDisabled : modalCardStyles.primaryButtonText}>
                {reported ? t('Error.Reported') : t('Error.ReportThisProblem')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {action && (
          <TouchableOpacity
            accessibilityLabel={action.text}
            accessibilityRole="button"
            testID={testIdWithKey(TestIds.errorModal.action)}
            style={action.style === 'destructive' ? modalCardStyles.destructiveButton : modalCardStyles.secondaryButton}
            onPress={() => {
              onDismiss()
              action.onPress()
            }}
            activeOpacity={0.8}
          >
            <Text
              style={
                action.style === 'destructive'
                  ? modalCardStyles.destructiveButtonText
                  : modalCardStyles.secondaryButtonText
              }
            >
              {action.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {enableReport && onReport && !reported && (
        <Text style={styles.noteText} testID={testIdWithKey(TestIds.errorModal.reportNote)}>
          <Text style={styles.noteBold}>{t('Error.NotePrefix')}</Text>
          {t('Error.NoteBody')}
          <Text
            style={styles.noteLink}
            accessibilityRole="link"
            testID={testIdWithKey(TestIds.errorModal.supportLink)}
            onPress={() => Linking.openURL(CONTACT_US_HELP_URL)}
          >
            {t('Error.SupportLink')}
          </Text>
        </Text>
      )}

      {reported && referenceCode && (
        <View style={styles.referenceContainer} testID={testIdWithKey(TestIds.errorModal.reportId)}>
          <Text style={styles.referenceLabel}>{t('Error.ReportId')}</Text>
          <View style={styles.referenceRow}>
            <Text
              style={styles.referenceCode}
              selectable
              accessibilityLabel={`${t('Error.ReportId')}: ${referenceCode}`}
              testID={testIdWithKey(TestIds.errorModal.reportIdValue)}
            >
              {referenceCode}
            </Text>
            <TouchableOpacity
              accessibilityLabel={copied ? t('Error.CodeCopied') : t('Error.CopyCode')}
              accessibilityRole="button"
              testID={testIdWithKey(TestIds.errorModal.copyReportId)}
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
          <Text style={styles.referenceHint}>{t('Error.ShareReportIdWithSupport')}</Text>
        </View>
      )}

      <Text style={styles.footer} testID={testIdWithKey(TestIds.errorModal.versionNumber)}>
        {t('Settings.Version')} {getVersion()} ({getBuildNumber()})
      </Text>
    </ModalCard>
  )
}

const styles = StyleSheet.create({
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
  primaryButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryButtonTextDisabled,
  },
  noteText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  noteBold: {
    fontWeight: '700',
  },
  noteLink: {
    fontWeight: '700',
    color: colors.link,
    textDecorationLine: 'underline',
  },
  referenceContainer: {
    marginTop: 16,
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
